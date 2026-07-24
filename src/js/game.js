// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame
const SCATTER_DURATION = 7 * 60;
const CHASE_DURATION = 20 * 60;
const GHOSTS_SETUP = [
  { x: 13, y: 14, kind: 'hunter', scatterTarget: { x: 27, y: 0 } },
  { x: 14, y: 14, kind: 'ambusher', scatterTarget: { x: 0, y: 0 } },
  { x: 12, y: 14, kind: 'trickster', scatterTarget: { x: 27, y: 30 } },
  { x: 15, y: 14, kind: 'shy', scatterTarget: { x: 0, y: 30 } },
];

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    mode: 'scatter',
    modeTimer: 0,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOSTS_SETUP.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      scatterTarget: { x: g.scatterTarget.x, y: g.scatterTarget.y },
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function ghostTargetAhead( actor, tiles ) {
  const dir = DIRS[ actor.dir ] || { x: 0, y: 0 };
  return {
    x: Math.round( actor.x ) + dir.x * tiles,
    y: Math.round( actor.y ) + dir.y * tiles,
  };
}

function getHunterGhost( ghosts ) {
  return ghosts.find( ( ghost ) => ghost.kind === 'hunter' ) || ghosts[ 0 ];
}

function getScatterTarget( g ) {
  return { x: g.scatterTarget.x, y: g.scatterTarget.y };
}

function getShyTarget( g, pacmanCell ) {
  const gx = Math.round( g.x );
  const gy = Math.round( g.y );
  const dist = Math.hypot( pacmanCell.x - gx, pacmanCell.y - gy );
  return dist > 8 ? pacmanCell : getScatterTarget( g );
}

function getChaseTarget( game, g ) {
  const pacmanCell = { x: Math.round( game.pacman.x ), y: Math.round( game.pacman.y ) };

  if ( g.kind === 'hunter' ) return pacmanCell;

  if ( g.kind === 'ambusher' ) {
    return ghostTargetAhead( game.pacman, 4 );
  }

  if ( g.kind === 'trickster' ) {
    const hunter = getHunterGhost( game.ghosts );
    const pivot = ghostTargetAhead( game.pacman, 2 );
    const hx = Math.round( hunter.x );
    const hy = Math.round( hunter.y );
    return {
      x: pivot.x + ( pivot.x - hx ),
      y: pivot.y + ( pivot.y - hy ),
    };
  }

  if ( g.kind === 'shy' ) {
    return getShyTarget( g, pacmanCell );
  }

  return pacmanCell;
}

function getGhostTarget( game, g ) {
  if ( game.mode === 'scatter' ) return getScatterTarget( g );
  return getChaseTarget( game, g );
}

function updateGhostMode( game ) {
  game.modeTimer++;
  const duration = game.mode === 'scatter' ? SCATTER_DURATION : CHASE_DURATION;
  if ( game.modeTimer < duration ) return;

  game.mode = game.mode === 'scatter' ? 'chase' : 'scatter';
  game.modeTimer = 0;
}

function getGhostChoices( grid, x, y, dir ) {
  const options = Object.keys( DIRS ).filter(
    ( nextDir ) => nextDir !== OPPOSITE[ dir ] && canMove( grid, x, y, nextDir, 'ghost' )
  );

  return options.length ? options : [ '' + OPPOSITE[ dir ] ];
}

function getNextGhostCell( grid, x, y, dir ) {
  const d = DIRS[ dir ];
  let nx = x + d.x;
  const ny = y + d.y;

  if ( ny === TUNNEL_ROW ) {
    if ( nx < 0 ) nx = grid[ 0 ].length - 1;
    else if ( nx >= grid[ 0 ].length ) nx = 0;
  }

  return { x: nx, y: ny };
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const target = getGhostTarget( game, g );
  const gx = Math.round( g.x );
  const gy = Math.round( g.y );
  const choices = getGhostChoices( grid, gx, gy, g.dir );

  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const next = getNextGhostCell( grid, gx, gy, dir );
    const dist = Math.abs( next.x - target.x ) + Math.abs( next.y - target.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }

  g.dir = best;
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.mode = 'scatter';
  game.modeTimer = 0;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOSTS_SETUP[ i ].x;
    g.y = GHOSTS_SETUP[ i ].y;
    g.dir = 'up';
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  updateGhostMode( game );
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
