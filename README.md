# Catálogo web · Escándalo Boutique

Sitio estático mobile-first. Se puede abrir con doble clic en `index.html` o publicar sin proceso de compilación.

## Estado del catálogo

- 14 referencias oficiales visibles con precio.
- Las cinco referencias Swim permanecen guardadas con `activo: false` para una futura publicación.
- ESC-02 y ESC-05 están en `assets/js/productos.js` con `activo: false` porque no hay fotografía en la carpeta del proyecto.
- Precios oficiales tomados de `Escandalo_Tabla_Precios_v4.xlsx`.
- WhatsApp: `+57 304 642 5299`.
- Instagram: `@escandalo.femenino`.
- Imágenes WebP por debajo de 250 KB, con JPG de respaldo.

## Editar configuración

Abre `assets/js/app.js` y cambia solo el bloque `CONFIG` al inicio:

- `whatsapp`: número completo con indicativo de país, sin espacios.
- `leadEndpoint`: URL de la aplicación web de Google Apps Script. Vacío significa que el registro se conserva solo en el navegador.
- `metaPixelId`: espacio reservado para el ID del Píxel de Meta.
- `duoDiscount`: descuento del combo Dúo (`0.10` equivale al 10%).

## Cambiar productos y precios

Todos los productos están en `assets/js/productos.js`.

- Para cambiar un precio, edita `precio` como número sin puntos ni signo pesos.
- Para ocultar o mostrar una referencia, usa `activo: false` o `activo: true`.
- Para una referencia sin precio, usa `precio: null`; el botón abrirá una consulta por WhatsApp.
- Para agregar un producto, duplica un objeto y actualiza código, nombre, línea, textos y rutas de imagen.
- Las imágenes usan una ruta sin extensión. Deben existir las versiones `.webp` y `.jpg` con el mismo nombre.

Líneas válidas para los filtros:

- `pantalon`
- `athleisure`
- `sexys`
- `swim`

## Guardar registros en Google Sheets

1. Crea una hoja nueva en Google Sheets.
2. Ve a **Extensiones → Apps Script**.
3. Reemplaza el contenido por `Code.gs` y guarda.
4. Elige **Implementar → Nueva implementación → Aplicación web**.
5. Ejecutar como: tu cuenta. Acceso: cualquier persona.
6. Copia la URL terminada en `/exec` y pégala en `leadEndpoint` dentro de `assets/js/app.js`.
7. Haz un registro de prueba. La pestaña `Registros` se crea automáticamente.

Si la conexión falla, el catálogo no se bloquea: el registro queda en una cola local y se reintenta en la siguiente visita.

## Publicar en Netlify

1. Entra a Netlify y selecciona **Add new site → Deploy manually**.
2. Arrastra la carpeta completa `catalogo-web`.
3. Cuando Netlify entregue el enlace, abre `catalogo.html` y prueba un producto, el Dúo y el formulario.
4. Configura el dominio definitivo en **Domain management**.

El archivo `netlify.toml` agrega caché para imágenes y encabezados básicos de seguridad.

## Prueba rápida antes de publicar

- Registro: acepta solo 10 dígitos empezando por 3 y exige consentimiento.
- Acceso directo: `catalogo.html` muestra el formulario inferior, pero permite cerrarlo después de 2 segundos.
- WhatsApp: prueba tres productos, una referencia sin precio y el Dúo.
- Filtros: comprueba que cada línea muestre el conteo correcto.
- Ficha: revisa galería, zoom y guía de tallas.
- Responsive: prueba 360, 375, 768 y 1440 px sin desplazamiento horizontal.
- Privacidad: valida el enlace desde ambos formularios.

## Archivos principales

- `index.html`: redirige directo a `catalogo.html` (se quitó la pantalla de registro el 12 nov 2026; el registro VIP queda opcional dentro del catálogo).
- `catalogo.html`: catálogo y flujo de compra.
- `privacidad.html`: política de tratamiento de datos.
- `assets/css/styles.css`: sistema visual responsive.
- `assets/js/app.js`: comportamiento y configuración.
- `assets/js/productos.js`: catálogo editable.
- `Code.gs`: receptor opcional para Google Sheets.

## Cambios de presentación (5 nov 2026)

- Tarjetas con la foto primero: 2 columnas en celular, 3 en tableta y 4 en computador. La talla y la cantidad se eligen en la ficha ("Ver y pedir").
- Orden de la grilla: sets de pantalón, Sport Escándalo y lencería.
- Combo Dúo: en la ficha, "Agregar a mi Dúo" guarda la prenda con su talla. Con 2 prendas aparece la barra inferior con el total y el 10% (`duoDiscount` en `CONFIG`), y "Pedir mi Dúo" manda un solo mensaje de WhatsApp con las dos referencias.
- El consentimiento del bloque VIP ahora dice para qué se usa el número.

## Antes de publicar

- Pega la URL de Apps Script en `leadEndpoint`. Sin ella, los registros se quedan solo en el navegador de cada clienta.
- Cuando tengas el dominio, cambia `og:image` en `index.html` y `catalogo.html` por la URL completa (por ejemplo `https://tudominio.com/assets/img/og-escandalo.jpg`) y agrega `<meta property="og:url" content="https://tudominio.com/">`. Sin la URL completa, WhatsApp no muestra la imagen al compartir el link.
- Hosting recomendado: Cloudflare Pages (gratis, sin límite de tráfico). Workers & Pages → Create → Pages → Upload assets y arrastra la carpeta.
