export const webOfferAddons = [
  {id:'seo-pro',name:'SEO Profesional',price:120,description:'Un servicio adicional de posicionamiento para tu web.',icon:'seo'},
  {id:'hosting-premium',name:'Hosting premium',price:15,description:'Alojamiento de alta velocidad para tu web.',icon:'hosting'},
] as const;
export const getWebOfferAddon=(id:string)=>webOfferAddons.find(a=>a.id===id);
