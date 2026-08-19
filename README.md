# Storefront Walk

Construí una interfaz marca blanca de e-commerce para comercios de barrio (almacén,

carnicería, verdulería, fiambrería, kiosco, limpieza). La experiencia simula caminar

dentro del comercio: no es una grilla de productos, es un recorrido espacial continuo.

EL OBJETIVO DE ESTE PROYECTO ES LA CALIDAD DE LA INTERACCIÓN, no el acabado visual.

La paleta, la tipografía definitiva y las imágenes se hacen después por fuera. Usá

estilos neutros y sobrios. Pero la RESPUESTA AL DEDO, los tiempos, las curvas y el

feedback tienen que estar impecables — eso es lo que se está validando acá.

## Stack — respetar exactamente, no sustituir

TanStack Start + React 19 + Vite + Tailwind + shadcn/radix + Zustand.

Rutas file-based en `src/routes/`. Estado en `src/store/`. Datos demo en `src/lib/seed.ts`.

Build target Cloudflare Worker (nitro).

NO crear backend, base de datos, Supabase, auth ni persistencia de servidor. Ya existe

por fuera. Todo es cliente + datos locales.

## Restricciones técnicas innegociables

1. NO instalar librerías nuevas. Sin Three.js, WebGL, Framer Motion, GSAP, react-spring,

   ni librerías de gestos. Animación con CSS transforms/transitions; gestos con pointer

   events nativos y requestAnimationFrame. Es para que el movimiento siga al dedo sin

   capas intermedias.

2. Toda la perspectiva con CSS: `perspective`, `transform-style: preserve-3d`,

   `rotateY`, `translateZ`, `scale`. Nada de 3D real.

3. SSR: la app buildea a Cloudflare Worker, el servidor renderiza. Todo lo que toque

   `window`, `document`, `localStorage`, `new Date()`, `navigator` o pointer events va

   detrás de un gate `mounted` (useState(false) + useEffect(()=>setMounted(true),[])).

   El servidor renderiza SOLO el hero; la escena navegable monta en cliente. Esto además

   hace que la fachada aparezca instantánea mientras carga el resto.

4. Selectores de Zustand: NUNCA devolver array u objeto nuevo desde un selector (nada de

   `.filter()`, `.map()`, `.sort()` adentro). Seleccionar crudo y derivar con `useMemo`.

   Zustand v5 + React 19 entra en loop infinito si el selector devuelve referencia nueva.

5. Ningún componente importa `seed.ts`. Todo el acceso a datos pasa por los stores.

## PRESUPUESTO DE INTERACCIÓN — cumplir estos números

Estos no son sugerencias. Son la definición de "está bien hecho".

### Latencia

- Feedback visual a cualquier toque: menos de 100ms. Siempre, aunque el contenido tarde.

- Durante un arrastre, el elemento sigue al dedo en el MISMO frame. Cero delay.

- 60fps sostenidos en todo movimiento.

### Regla crítica del arrastre

Durante el drag, NUNCA aplicar `transition` CSS sobre la propiedad que se está

arrastrando. El transform se escribe directo por `ref.current.style.transform` dentro

del rAF loop. La `transition` se habilita SOLO al soltar, para la inercia y el encaje.

Si hay transition activa durante el drag, el movimiento se siente pegajoso y todo el

producto se cae. Este es el error más importante a evitar.

### Regla crítica de render

El cálculo de posición y de colisión de la aguja corre en el rAF loop leyendo refs, NO

en estado de React. El estado de React se actualiza ÚNICAMENTE cuando el card activo

CAMBIA, no en cada frame. Renderizar React a 60fps mata la performance.

### Tiempos y curvas

| Evento | Duración | Curva |

|---|---|---|

| Feedback de toque (presión) | 80ms | ease-out |

| Crossfade de nombre y miniatura | 120ms | linear |

| Pulso de zoom al entrar/salir | 300ms | cubic-bezier(0.2, 0.8, 0.2, 1) |

| Cambio de nivel | 420ms | cubic-bezier(0.2, 0.8, 0.2, 1) |

| Rebote elástico en el borde | 260ms | cubic-bezier(0.34, 1.4, 0.64, 1) |

| Entrada por la puerta | 800-1200ms | atada al scroll, no a timer |

| Aparición del carrito | 1200ms total | entrada 200ms ease-out, salida 400ms ease-in |

### Inercia

Al soltar: continuar con rAF aplicando fricción exponencial (factor ~0.94 por frame),

detener cuando la velocidad baja de 0.15px/frame. La velocidad inicial se calcula del

promedio de los últimos 3 movimientos del puntero, no del último.

### Interrumpibilidad

CUALQUIER animación en curso se interrumpe con un nuevo gesto. Si el usuario toca

durante la inercia, la inercia se corta en ese punto exacto y el nuevo gesto arranca

desde ahí. Nunca hacer esperar a que termine una animación. Nunca ignorar un input.

### Ergonomía

- Todo lo accionable vive en el TERCIO INFERIOR de la pantalla, dentro del alcance del

  pulgar. El chrome superior (logo, lupa, menú) es solo para acciones ocasionales.

- Área táctil mínima de 44x44px en todo elemento accionable, aunque se vea más chico.

- La zona de gesto del pasillo es una banda ancha en el tercio inferior, no un elemento

  puntual.

### Haptics

Cuando la aguja pasa de un card al siguiente, disparar `navigator.vibrate(8)` si la API

existe. Es lo que convierte el movimiento en un dial con clicks. Verificar existencia

antes de llamar, y respetar prefers-reduced-motion.

### Accesibilidad de movimiento

Con `prefers-reduced-motion: reduce`: reemplazar los movimientos de cámara por

crossfades, desactivar el pulso de zoom y la inercia (encaje directo). La funcionalidad

completa se mantiene, solo cambia cómo se transiciona.

### Nunca un estado sin respuesta

Cada acción produce feedback inmediato. Si algo se está cargando, el hero es la pantalla

de carga — no usar spinners ni skeletons genéricos.

## Principio rector

Una sola cámara sobre un riel. La app no es una pila de pantallas: es una posición

continua dentro de un espacio. Nunca un corte seco entre vistas.

## Regla de datos: cero hardcodeo

Ningún texto, categoría, producto ni color escrito dentro de un componente. Todo sale

del store, que se hidrata de `seed.ts`. Cambiar `seed.ts` cambia el comercio entero.

## Tipos — `src/types/index.ts`

interface Tenant {

  name: string

  logoUrl: string

  facadeImageUrl: string

  rating: number

  isOpen: boolean

  paymentMethods: string[]

  offerProductIds: string[]

  categories: CategoryNode[]

  stackedCategories: CategoryNode[]

  brands: Brand[]

  products: Product[]

}

interface CategoryNode {

  id: string

  name: string

  children?: CategoryNode[]         // RECURSIVO, profundidad arbitraria

  brandIds?: string[]               // solo en nodos hoja

  thumbnailProductIds?: string[]    // 3-4 productos para la miniatura

}

interface Brand { id: string; name: string; logoUrl: string }

interface Product {

  id: string

  name: string

  brandId: string

  categoryId: string

  color: string                     // placeholder visual

  variants: { label: string; price: number }[]

  inStock: boolean

}

## Datos demo — `src/lib/seed.ts`

Exportar `export const seedTenant: Tenant`:

- 6 categorías de góndola: Almacén, Limpieza, Vinos, Lácteos, Carnes, Perfumería

- 4 apiladas: Kiosco, Bazar, Juguetes, Ropa

- Dentro de Almacén, un árbol REAL de 3 niveles:

  Almacén > [Alimentos secos, Enlatados y conservas, Aceites salsas y condimentos,

  Panificados y crackers]

  Enlatados y conservas > [Pescados enlatados, Frutas y verduras enlatadas, Picadillos,

  Legumbres]

  Frutas y verduras enlatadas > [Frutas, Ensaladas, Jardineras, Cocktails]

- 8 marcas, ~25 productos, algunos con inStock:false

## Stores — `src/store/`

`useTenant.ts` — `tenant`, `loading`, `hydrate()` que hoy setea `seedTenant` y lleva el

comentario `// TODO: en modo remoto, fetch a /api/tenant`. Es el único punto que cambia

al cablear el backend.

`useNavigation.ts`

- `level: 'facade' | 'entering' | 'salon' | 'aisle' | 'brands' | 'product'`

- `path: string[]`, `activeIndex: number`, `salonIndex: number`

- `enter(nodeId)`, `goBack()`, `setActiveIndex(i)`, `goToLevel(l)`, `reset()`

- `goBack()` sube exactamente UN nivel, nunca más.

`useCart.ts` — `items`, `add()`, `remove()`, `total`

## Gesto del arco — `src/lib/useThumbArc.ts`

Hook propio con pointer events nativos.

- El pulgar describe un ARCO, no una línea recta: la detección tolera desviación en Y

  sin cancelar el gesto. NO usar deltaX puro — usar magnitud proyectada del

  desplazamiento y descartar solo si el ángulo sale de un rango amplio.

- Movimiento continuo con inercia según el presupuesto de arriba.

- Arco descendente = avanzar. Arco ascendente = retroceder.

- Expone `{ offsetRef, isDragging, bind, onIndexChange }`. El offset vive en un ref, no

  en estado.

- En desktop el mismo hook maneja wheel y drag de mouse leyendo la componente dominante.

## Ruta única — `src/routes/index.tsx`

Toda la experiencia en una sola ruta. El nivel lo maneja `useNavigation`, no el router.

## Chrome persistente

Arriba izquierda: logo (tap vuelve al hero). Arriba centro: lupa. Arriba derecha:

hamburguesa (Inicio, Categorías, Mi carrito, Contacto). Abajo derecha: botón carrito con

contador, visible solo si hay items.

## NIVEL 1 — Fachada

- Imagen del frente a pantalla completa.

- Detrás, capa de cielo con gradiente CSS según la hora local: día, atardecer, noche.

  Interpolar con la hora exacta, no presets escalonados. Detrás del gate `mounted`.

- Chevrones dobles animados hacia abajo con la palabra "scroll".

- Banda de confianza: estrellas, "Abierto ahora", medios de pago.

- Banda ancha "Ver ofertas": despliega un carrusel horizontal de ofertas sin cambiar de

  nivel.

- Scroll hacia abajo dispara la entrada.

## NIVEL 2 — Entrada

Transición atada al scroll, NO a un timer: la cámara atraviesa la puerta con un dolly

hacia adelante (scale + translateZ + fade). Si el usuario revierte el scroll a mitad, la

animación revierte proporcionalmente. Es scrubbing, no reproducción.

## NIVEL 3 — Salón

- Carrusel horizontal de góndolas en perspectiva, una por categoría.

- Mobile: UNA al centro enfrentada a cámara + DOS a cada lado alejándose y girando hacia

  adentro (rotateY + translateZ + scale decrecientes). 5 visibles.

- Rótulo de categoría sobre cada góndola.

- Indicador "<< swipe >>" debajo.

- Debajo, lista vertical de botones anchos, uno por `stackedCategories`.

- Swipe o drag recorre, con inercia. Tap en la central entra al pasillo.

## NIVEL 4 — Pasillo (la pantalla más importante)

UN SOLO componente recursivo que recibe un `CategoryNode` y renderiza sus hijos. Se usa

para TODOS los niveles del árbol. No programar un componente por profundidad.

Layout:

- Góndola larga sobre el lado IZQUIERDO, perspectiva fuerte, fuga hacia la derecha.

  Piso visible abajo.

- Dividida en cards verticales, uno por hijo del nodo actual.

- La góndola conserva SIEMPRE las mismas dimensiones y perspectiva a cualquier

  profundidad. NO hay zoom acumulativo.

Card flotante:

- Card rectangular con esquinas redondeadas, ESTÁTICO, en el tercio inferior, ligeramente

  hacia la derecha. Nunca se mueve.

- Su VÉRTICE SUPERIOR IZQUIERDO es la "aguja de lectura": punto fijo de colisión. El card

  de góndola que coincide con ese vértice es el activo. Metáfora: aguja de tocadiscos —

  la aguja no se mueve, el material pasa por debajo.

- Contiene el nombre de la subcategoría activa + una miniatura con 3-4 productos

  (`thumbnailProductIds`) agrupados y superpuestos con leve rotación, no en fila.

- EL CARD FLOTANTE ES EL BOTÓN DE ENTRAR. Tap sobre él desciende un nivel.

- Encima, línea de ~12px con el rastro: "Enlatados y conservas › Frutas y verduras

  enlatadas".

- UN SOLO card flotante en todo momento. Nunca se apilan.

Resalte:

- El card de góndola activo lleva BRILLO PERIMETRAL LEVE (box-shadow).

- El card flotante lleva el MISMO brillo, misma intensidad.

- Ese brillo pareado es la ÚNICA señal de activo. Sin cambio de fondo, sin escala, sin

  borde sólido. No agregar más señales.

Comportamiento:

- Estado inicial: la aguja apunta SIEMPRE al primer card. Sin memoria de posición.

- Al desplazarse, la aguja va señalando los siguientes, con haptic en cada cambio.

- Salida: retroceder hasta el inicio + un arco ascendente adicional sube UN nivel. El

  botón atrás hace lo mismo desde cualquier posición. Nunca saltar más de un nivel.

- Señal de borde: al llegar al inicio, rebote elástico según la curva del presupuesto.

Zoom discreto (acuse de recibo):

- Al ENTRAR: pulso de zoom IN hacia el card, ~10% de escala. La góndola vuelve a su

  escala original con el contenido nuevo.

- Al SALIR: pulso de zoom OUT equivalente.

- Es un PULSO, no un estado: sale y vuelve.

Transiciones de texto:

- Nombre y miniatura del card flotante cambian con crossfade cuando la aguja pasa al card

  siguiente. Durante un swipe con inercia van cambiando en vivo, sin acumular retraso.

## NIVEL 5 — Marcas

Carrusel de logos en disposición OVALADA HORIZONTAL, "forma de ojo": centrales grandes y

nítidos, extremos comprimidos y con bordes desvanecidos (mask-image o gradiente). Swipe

lateral con inercia. Tap entra al producto.

## NIVEL 6 — Producto

- Carrusel: UNO al centro completo + DOS a cada lado reducidos y en perspectiva.

- Debajo, tabla plana de presentaciones ("500 gr — $1200"), cifras tabulares alineadas a

  la derecha.

- Botón agregar al carrito, dentro del alcance del pulgar.

## Lupa

Al abrirla:

1. Campo de texto para buscar por nombre.

2. Debajo, grilla de marcas con el MISMO tratamiento de ojo con bordes desvanecidos que

   el nivel 5. Es el estado por defecto, no un resultado.

Al tocar una marca: carrusel con todos los tipos de producto de esa marca.

Los productos con `inStock:false` aparecen SOLO en resultados de búsqueda por texto, con

la leyenda "sin stock". NUNCA en la góndola.

## Carrito

- Al agregar un producto, un carrito aparece brevemente al pie en vista de picado

  diagonal, con los productos amontonados de forma natural y desordenada (rotación leve

  aleatoria, superposición), no en grilla. Después se retira.

- El botón del carrito abre la vista completa: fondo desenfocado + productos en el MISMO

  carrusel del nivel 6, en orden de selección.

- Al volver del carrito, el usuario vuelve exactamente donde estaba.

## Onboarding

Los gestos se dibujan sobre la escena y son dinámicos, tipo línea de carrera de un juego

de Fórmula 1: el arco del pulgar aparece trazado sobre el pasillo animándose en la

dirección disponible; los chevrones laten en el hero. El trazo se atenúa a medida que el

usuario ejecuta bien el gesto y desaparece a la tercera repetición.

NUNCA bloquear con un modal, nunca "siguiente / entendido". Persistir en localStorage,

detrás del gate `mounted`.

## Estados vacíos

- Categoría sin hijos ni productos: mensaje corto dentro de la góndola, sin sacar al

  usuario del espacio.

- Búsqueda sin resultados: sugerir la grilla de marcas.

- Carrito vacío: mensaje breve + botón para volver al salón.

## Desktop

Mismo motor de estados, otra capa de input. No es versión degradada. Rueda del mouse =

eje de profundidad. Drag = equivalente al arco. Flechas y Escape. Botones visibles de

atrás / entrar / carrito.

## Performance

- Animar SOLO `transform` y `opacity`. Nunca `top`, `left`, `width` ni `margin`.

- `will-change: transform` puntual en los elementos que se mueven, removido al terminar.

- Renderizar solo los cards dentro de la ventana de visión + un margen. El resto no se

  instancia.

## Dirección visual mínima

Sobria y neutra. Fondo oscuro para que la escena se lea. La jerarquía se comunica con luz

y desenfoque, nunca con bordes sólidos. El desenfoque siempre significa profundidad, no

decoración. Nada más — la estética de marca se hace después.

## Fuera de alcance — NO implementar

Backend, base de datos, Supabase, autenticación, login, checkout, pasarela de pago,

historial de compras, panel de administración, modelos 3D reales, diseño de marca.

Los productos son placeholders: un rectángulo con `product.color` y su nombre.

## Criterio de aceptación

1. Se recorre de punta a punta: hero → entrada → salón → pasillo → 3 niveles de árbol →

   marcas → producto → agregar al carrito → ver carrito.

2. El arrastre sigue al dedo sin lag perceptible.

3. Cualquier animación se interrumpe con un nuevo gesto.

4. La aguja cambia de card con haptic y crossfade, sin caídas de framerate.

5. Cambiar `seed.ts` cambia el comercio completo sin tocar componentes.

6. El pasillo funciona a cualquier profundidad con un solo componente.

7. Cero dependencias nuevas en package.json.

8. Sin errores de hidratación ni "Maximum update depth exceeded".

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e947b78d-cfb2-4dd8-8247-66e5ee56c9d8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
