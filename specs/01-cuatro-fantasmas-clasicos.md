# SPEC 01 — Cuatro fantasmas clásicos

> **Status:** Approved
> **Depends on:** Ninguna
> **Date:** 2026-07-25
> **Objective:** Implementar los cuatro fantasmas clásicos de Pac-Man con comportamientos diferenciados y alternancia entre los modos `chase` y `scatter`.

## Scope

**In:**

- Definir cuatro comportamientos distintos para los fantasmas existentes en `src/js/game.js`.
- Mantener la estructura actual del juego con `g.kind` como identificador del tipo de fantasma.
- Implementar los roles clasicos inspirados en Pac-Man:
- `hunter` como perseguidor agresivo directo.
- un fantasma que apunte `4` celdas por delante de Pac-Man.
- un fantasma que calcule su objetivo usando la posicion de Pac-Man y la del fantasma rojo.
- un fantasma que persiga cuando este lejos y se disperse a su esquina cuando este a `8` celdas o menos.
- Agregar alternancia entre los modos `chase` y `scatter` para que el comportamiento sea clasico y no constante.
- Mantener el juego funcional con el mismo canvas, el mismo laberinto y la misma carga por `<script>` globales.

**Out of scope (for future specs):**

- Power pellets.
- Modo `frightened` o fantasmas vulnerables.
- Comer fantasmas y sumar puntos por ello.
- Cambios visuales mayores, sprites nuevos o animaciones nuevas para comunicar estados.
- Salida escalonada de la casa de fantasmas con reglas arcade exactas.
- Ajuste progresivo de dificultad por nivel.
- Nuevos niveles o cambios en `MAZE`.

## Data model

```js
const game = {
  state: 'start',
  score: 0,
  lives: 3,
  dotsRemaining: 0,
  grid: [],
  mode: 'scatter', // 'scatter' | 'chase'
  modeTimer: 0,
  pacman: {
    x: 0,
    y: 0,
    dir: 'left',
    nextDir: null,
    speed: 0.125,
  },
  ghosts: [
    {
      x: 0,
      y: 0,
      dir: 'up',
      speed: 0.1,
      kind: 'hunter', // rojo: perseguidor directo
      scatterTarget: { x: 27, y: 0 },
    },
    {
      x: 0,
      y: 0,
      dir: 'up',
      speed: 0.1,
      kind: 'ambusher', // rosa: 4 celdas por delante de Pac-Man
      scatterTarget: { x: 0, y: 0 },
    },
    {
      x: 0,
      y: 0,
      dir: 'up',
      speed: 0.1,
      kind: 'trickster', // cian: objetivo combinado con Pac-Man y el rojo
      scatterTarget: { x: 27, y: 30 },
    },
    {
      x: 0,
      y: 0,
      dir: 'up',
      speed: 0.1,
      kind: 'shy', // naranja: persigue lejos, se dispersa cerca
      scatterTarget: { x: 0, y: 30 },
    },
  ],
};
```

Conventions:

- `mode` define el comportamiento global actual de los fantasmas: `scatter` o `chase`.
- `modeTimer` cuenta los frames o ticks usados para alternar entre modos.
- `kind` se conserva como el campo principal para identificar la personalidad de cada fantasma.
- `scatterTarget` define la esquina fija de cada fantasma durante `scatter`.
- Los objetivos de persecucion se calculan en tiempo de ejecucion; no se persisten en el estado.

## Implementation plan

1. Extender el estado creado en `createGame()` dentro de `src/js/game.js` para incluir `mode`, `modeTimer` y los cuatro fantasmas con `kind` y `scatterTarget` definidos.
   Manual test: abrir el juego y confirmar que carga sin errores en consola y que los cuatro fantasmas siguen apareciendo.

2. Separar la logica de seleccion de objetivo de cada fantasma en `src/js/game.js` para que cada `kind` calcule su destino de `chase` de forma distinta.
   Manual test: observar varias intersecciones y confirmar que el rojo persigue directo, el rosa se anticipa, el cian no sigue una ruta identica al rojo y el naranja cambia su tendencia segun la distancia.

3. Agregar la alternancia global entre `scatter` y `chase` en `update()` usando `mode` y `modeTimer`, manteniendo el juego jugable en todo momento.
   Manual test: jugar durante suficiente tiempo y confirmar que los fantasmas cambian de patron de persecucion a dispersion sin congelarse ni atravesar muros.

4. Aplicar el objetivo de `scatter` por esquina para cada fantasma y hacer que Clyde use la regla de distancia de `8` celdas para decidir entre perseguir o dispersarse durante `chase`.
   Manual test: atraer a los fantasmas a zonas abiertas del mapa y verificar que cada uno puede desviarse hacia su esquina cuando corresponde.

5. Ajustar la toma de decisiones en intersecciones para usar el objetivo activo de cada fantasma sin romper tuneles, colisiones, reinicio de vidas ni condiciones de victoria o derrota.
   Manual test: perder una vida, usar el tunel y terminar una partida para confirmar que el comportamiento nuevo no rompe el flujo actual.

## Acceptance criteria

- [ ] El juego carga desde `src/index.html` sin errores en consola.
- [ ] Los cuatro fantasmas siguen apareciendo al iniciar la partida.
- [ ] El fantasma rojo persigue directamente la posicion actual de Pac-Man durante `chase`.
- [ ] El fantasma rosa usa como objetivo una posicion ubicada `4` celdas por delante de la direccion actual de Pac-Man durante `chase`.
- [ ] El fantasma cian calcula su objetivo de `chase` usando la logica clasica combinada entre Pac-Man y el fantasma rojo.
- [ ] El fantasma naranja persigue a Pac-Man cuando esta a mas de `8` celdas y cambia a su objetivo de esquina cuando esta a `8` celdas o menos.
- [ ] Todos los fantasmas alternan entre `scatter` y `chase` sin detenerse ni atravesar muros.
- [ ] Durante `scatter`, cada fantasma intenta dirigirse a su esquina asignada del mapa.
- [ ] El tunel lateral sigue funcionando para Pac-Man y para los fantasmas despues del cambio.
- [ ] Al perder una vida, Pac-Man y los fantasmas reinician posiciones sin romper la logica de comportamiento.
- [ ] La condicion de victoria al comer todos los puntos y la condicion de derrota al perder todas las vidas siguen funcionando.

## Decisions

- **Sí:** mantener `src/js/game.js` como archivo principal de la IA de fantasmas. Ya concentra estado, movimiento y reglas.
- **No:** crear un sistema nuevo de modulos o archivos extra para esta spec. Seria mas grande de lo necesario para el estado actual del proyecto.
- **Sí:** conservar `g.kind` como nombre del campo para identificar la personalidad de cada fantasma. Minimiza cambios estructurales.
- **No:** renombrar `kind` a `aiType` u otro nombre. No aporta valor funcional en esta iteracion.
- **Sí:** implementar las cuatro personalidades clasicas base: perseguidor directo, emboscador a `4` celdas, objetivo combinado con el rojo y perseguidor timido con umbral de `8` celdas.
- **No:** dejar tres fantasmas aleatorios y solo uno agresivo. No cumple el objetivo de diferenciacion clasica.
- **Sí:** incluir alternancia global entre `scatter` y `chase`. Es parte del comportamiento clasico que da variedad real al movimiento.
- **No:** agregar `frightened`, power pellets o fantasmas comibles en esta spec. Eso merece una spec separada.
- **Sí:** verificar el comportamiento de forma visual dentro del juego.
- **No:** agregar indicadores extra en UI o consola para mostrar el modo actual. Mantiene limpia la experiencia actual.
- **Sí:** dejar fuera reglas arcade exactas de salida escalonada desde la casa de fantasmas.
- **No:** intentar replicar todo el sistema original de temporizadores y excepciones del arcade en esta primera spec. Abriria demasiado el alcance.

## Risks

| Risk | Mitigation |
| --- | --- |
| La nueva logica de objetivos puede hacer que un fantasma elija giros invalidos en intersecciones. | Mantener `canMove()` como filtro unico antes de aplicar cualquier direccion nueva. |
| La alternancia entre `scatter` y `chase` puede producir cambios bruscos de direccion o comportamientos incoherentes despues de perder una vida. | Reiniciar `mode` y `modeTimer` junto con las posiciones cuando se reinicia la ronda. |
| La logica clasica de Inky depende de la posicion del fantasma rojo y puede generar rutas poco intuitivas si el rojo queda bloqueado lejos. | Documentar que el objetivo de Inky sigue siendo derivado del rojo aunque el resultado no siempre parezca una persecucion directa. |
| El mapa actual no replica todas las reglas arcade originales, por lo que el comportamiento sera una aproximacion clasica y no una emulacion exacta. | Dejar explicitamente fuera de alcance las reglas arcade exactas y validar solo los patrones base definidos en esta spec. |

## What is **not** in this spec

- Power pellets.
- Modo `frightened` o fantasmas vulnerables.
- Comer fantasmas y sumar puntos por ello.
- Cambios visuales mayores, sprites nuevos o animaciones nuevas para comunicar estados.
- Salida escalonada de la casa de fantasmas con reglas arcade exactas.
- Ajuste progresivo de dificultad por nivel.
- Nuevos niveles o cambios en `MAZE`.

Cada uno de esos puntos, si entra despues, va en su propia spec.
