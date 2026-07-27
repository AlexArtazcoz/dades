/* Amplada de la barra esquerra — única font de veritat per al llenç.
   En pantalles petites la barra és més estreta (72px sota els 640 d'amplada,
   110 altrament). Es calcula un cop per càrrega: girar el mòbil demana un
   refresc. Cap mòbil real fa menys de 330px: una amplada menor és un viewport
   encara sense assentar (p. ex. una WebView arrencant) i es tracta com a
   escriptori. */
const VIEWPORT_W =
  typeof window === 'undefined' || window.innerWidth < 330 ? 1280 : window.innerWidth;

export const LEFTBAR_W = VIEWPORT_W <= 640 ? 72 : 110;
