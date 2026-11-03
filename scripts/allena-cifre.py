# Allena il modello di diffusion delle cifre per /learn/diffusion/ e salva i pesi in public/learn/cifre.bin.
# È una piccola U-Net: legge l'immagine sporca, il passo e la cifra chiesta, e stima il rumore. src/lib/cifre.ts la riscrive in TypeScript.
# Si lancia con: python scripts/allena-cifre.py <cartella per MNIST> [epoche]
import gzip, math, os, struct, sys, time, urllib.request, zlib
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

CANALI, PASSI_T, COND, GRUPPO = (16, 32, 48), 100, 64, 64
cartella = sys.argv[1]
EPOCHE = int(sys.argv[2]) if len(sys.argv) > 2 else 30
os.makedirs(cartella, exist_ok=True)

def scarica(nome):
    p = os.path.join(cartella, nome)
    if not os.path.exists(p):
        urllib.request.urlretrieve('https://ossci-datasets.s3.amazonaws.com/mnist/' + nome, p)
    return gzip.open(p, 'rb').read()

img = scarica('train-images-idx3-ubyte.gz')
_, n, a, b = struct.unpack('>4I', img[:16])
X = torch.from_numpy(np.frombuffer(img, np.uint8, offset=16).reshape(n, 1, a, b).copy()).float() / 127.5 - 1
Y = torch.from_numpy(np.frombuffer(scarica('train-labels-idx1-ubyte.gz'), np.uint8, offset=8).copy()).long()

# Quanta immagine resta al passo t, da 1 a quasi 0
abar = torch.cos((torch.arange(PASSI_T + 1) / PASSI_T + 0.008) / 1.008 * math.pi / 2) ** 2
abar = (abar / abar[0]).clamp(min=1e-4)

def tempo(t):
    u = t.float() / PASSI_T
    return torch.stack([f(math.pi * k * u) for k in (1, 2, 4, 8) for f in (torch.sin, torch.cos)], 1)

class Res(nn.Module):
    def __init__(s, c):
        super().__init__()
        s.a, s.b, s.c = nn.Conv2d(c, c, 3, padding=1), nn.Conv2d(c, c, 3, padding=1), nn.Linear(COND, c)
    def forward(s, x, e):
        return F.relu(x + s.b(F.relu(s.a(x)) + s.c(e)[:, :, None, None]))

class UNet(nn.Module):
    def __init__(s):
        super().__init__()
        a, b, c = CANALI
        s.c1, s.c2 = nn.Linear(18, COND), nn.Linear(COND, COND)
        s.ini, s.r1, s.d1, s.r2, s.d2, s.r3, s.r4 = nn.Conv2d(1, a, 3, padding=1), Res(a), nn.Conv2d(a, b, 3, 2, 1), Res(b), nn.Conv2d(b, c, 3, 2, 1), Res(c), Res(c)
        s.u2, s.r5, s.u1, s.r6, s.fine = nn.Conv2d(c + b, b, 3, padding=1), Res(b), nn.Conv2d(b + a, a, 3, padding=1), Res(a), nn.Conv2d(a, 1, 3, padding=1)
    def forward(s, x, t, y):
        e = s.c2(F.relu(s.c1(torch.cat([tempo(t), F.one_hot(y, 10).float()], 1))))
        h1 = s.r1(F.relu(s.ini(x)), e)
        h2 = s.r2(F.relu(s.d1(h1)), e)
        h = s.r4(s.r3(F.relu(s.d2(h2)), e), e)
        h = s.r5(F.relu(s.u2(torch.cat([F.interpolate(h, scale_factor=2), h2], 1))), e)
        h = s.r6(F.relu(s.u1(torch.cat([F.interpolate(h, scale_factor=2), h1], 1))), e)
        return s.fine(h)

rete, media = UNet(), UNet()
media.load_state_dict(rete.state_dict())
print('pesi', sum(p.numel() for p in rete.parameters()), flush=True)
opt = torch.optim.Adam(rete.parameters(), 2e-3)
tot = EPOCHE * (len(X) // GRUPPO)
piano = torch.optim.lr_scheduler.OneCycleLR(opt, 2e-3, total_steps=tot)
inizio = time.time()
k = 0
for ep in range(EPOCHE):
    ordine, somma = torch.randperm(len(X)), 0.0
    for i in range(len(X) // GRUPPO):
        q = ordine[i * GRUPPO:(i + 1) * GRUPPO]
        x0, y, t = X[q], Y[q], torch.randint(1, PASSI_T + 1, (GRUPPO,))
        eps, a = torch.randn_like(x0), abar[t][:, None, None, None]
        err = F.mse_loss(rete(a.sqrt() * x0 + (1 - a).sqrt() * eps, t, y), eps)
        opt.zero_grad(); err.backward(); opt.step(); piano.step()
        somma += err.item(); k += 1
        with torch.no_grad():
            for m, p in zip(media.parameters(), rete.parameters()): m.lerp_(p, 0.002)
    print(f'epoca {ep + 1}/{EPOCHE} errore {somma / (len(X) // GRUPPO):.4f} {time.time() - inizio:.0f}s', flush=True)

    # Salva a ogni epoca, così si può guardare il risultato prima della fine
    pesi = np.concatenate([p.detach().numpy().ravel() for p in media.parameters()]).astype('<f4')
    os.makedirs('public/learn', exist_ok=True)
    pesi.tofile('public/learn/cifre.bin')

    @torch.no_grad()
    def prova(passi=20):
        y = torch.arange(10).repeat_interleave(8)
        x = torch.randn(80, 1, 28, 28)
        tempi = [round(PASSI_T - j * PASSI_T / passi) for j in range(passi)] + [0]
        for j in range(passi):
            t = torch.full((80,), tempi[j])
            e = media(x, t, y)
            a, d = abar[tempi[j]], abar[tempi[j + 1]]
            p = ((x - (1 - a).sqrt() * e) / a.sqrt()).clamp(-1, 1)
            x = d.sqrt() * p + (1 - d).sqrt() * ((x - a.sqrt() * p) / (1 - a).sqrt())
        return x
    if (ep + 1) % 5 == 0 or ep + 1 == EPOCHE:
        g = ((prova().clamp(-1, 1) + 1) * 127.5).byte().numpy()[:, 0].reshape(10, 8, 28, 28).transpose(0, 2, 1, 3).reshape(280, 224)
        g = np.kron(g, np.ones((2, 2), np.uint8))
        grezzo = b''.join(b'\0' + r.tobytes() for r in g)
        def pezzo(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d))
        with open(os.path.join(cartella, 'prova.png'), 'wb') as f:
            f.write(b'\x89PNG\r\n\x1a\n' + pezzo(b'IHDR', struct.pack('>2I5B', g.shape[1], g.shape[0], 8, 0, 0, 0, 0)) + pezzo(b'IDAT', zlib.compress(grezzo)) + pezzo(b'IEND', b''))
print('fine', flush=True)
