// Il ponte fra l'intro e la home. Il mondo 3D scrive dove sta ogni uccello sullo schermo, in pixel; l'intro porta ogni uccello a pixel
// su quello con lo stesso numero, e dice quanti sono arrivati: quelli li disegna il mondo 3D. Così lo stormo è lo stesso.
export const ponte: { xy: Float32Array | null; visibili: number } = { xy: null, visibili: 0 };
