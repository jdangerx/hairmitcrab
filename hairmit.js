var Engine = Matter.Engine,
    Events = Matter.Events,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Body = Matter.Body,
    Composite = Matter.Composite,
    Composites = Matter.Composites,
    Constraint = Matter.Constraint,
    MouseConstraint = Matter.MouseConstraint,
    Mouse = Matter.Mouse,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Vector = Matter.Vector;

// create engine
var engine = Engine.create({ constraintIterations: 1, positionIterations: 2, velocityIterations: 2 }),
    world = engine.world;

var SCORE = 0;

const WIDTH = 800;
const HEIGHT = 600;

// create renderer
var render = Render.create({
  element: document.body,
  engine: engine,
  options: {
    width: WIDTH,
    height: HEIGHT,
    wireframes: false,
    background: '#9999cc'
  }
});

Render.run(render);

// create runner
var runner = Runner.create();
Runner.run(runner, engine);

// game stuff

function manyHairs(body, nHairs) {
  var hairs = Composite.create();
  for (var i = 0; i < nHairs; i++) {
    const angle = -Math.PI/nHairs * (i+1.5) * 0.75;
    Composite.add(hairs, oneHair(body, {angle}));
  }
  return hairs;
}

// TODO where to put this
world.gravity.scale = 0.08;

const GROUPS =[
  Body.nextGroup(true),
  Body.nextGroup(true),
  Body.nextGroup(true),
  Body.nextGroup(true),
  Body.nextGroup(true),
  Body.nextGroup(true),
  Body.nextGroup(true),
  Body.nextGroup(true),
  Body.nextGroup(true),
];

function getGroup() {
  return GROUPS[Math.random() * GROUPS.length | 0];
}
function oneHair(circle, hairOpts) {
  var opts = {
    length: 30,
    width: 15,
    angle: Math.PI,
    segmentsPerHair: 10,
    angularStiffness: 0.95,
    stiffness: 0.2,
    kinkiness: 0.0,
    overlap: 0.6,
    opacity: 0
  };
  Object.assign(opts, hairOpts);
  const group = getGroup();
  // make actual hair bodies
  const radius = circle.circleRadius;
  const radiusOffset = 1.1 + Math.random() * 0.2;
  const start = {
    x: circle.position.x + radiusOffset * radius * Math.cos(opts.angle),
    y: circle.position.y + radiusOffset * radius * Math.sin(opts.angle)
  };
  var strand = Composites.stack(
    start.x,
    start.y,
    1,
    opts.segmentsPerHair,
    0,
    -opts.length * opts.overlap,
    (x, y) =>
      Bodies.rectangle(x, y, opts.width, opts.length, {
      collisionFilter: { group },
      chamfer: 5,
      frictionAir: 1,
      friction: 1,
      restitution: 0,
      slop: 0.3,
      render: {
        visible: false
      }
    })
  );

  strand.bodies.forEach(
    (body, i) => Body.setDensity(body, body.density * Math.pow(0.95, i))
  );
  strand
    .constraints
    .filter(({label}) => label === "pin")
    .forEach((pin, i) => pin.angularStiffness = Math.pow(0.90, i)) ;
  // attach segments to each other
  const distFromEnd = (1 - opts.overlap) / 2;
  Composites.chain(strand, 0, distFromEnd, 0, -distFromEnd, {
    label: "pin",
    length: 0,
    stiffness: 0.9,
    angularStiffness: opts.angularStiffness,
    render: {
      visible: false
    }
  });

  // actually display
  Composites.chain(strand, 0, -0.4, 0, -0.4, {
    label: "hair",
    length: opts.length * (1 - opts.overlap),
    stiffness: 0.0,
    angularStiffness: opts.angularStiffness,
    render: {
      anchors: false,
      type: "line",
      lineWidth: 15,
      strokeStyle: "#442200",
    }
  });

  Composites.chain(strand, 0, -0.4, 0, -0.4, {
    label: "hair",
    length: opts.length * (1 - opts.overlap),
    stiffness: 0.0,
    angularStiffness: opts.angularStiffness,
    render: {
      anchors: false,
      type: "line",
      lineWidth: 12,
      strokeStyle: "#663300",
    }
  });
  // fix the first one
  var firstSegment = strand.bodies[0];
  var startPoint = {x: firstSegment.position.x,
                    y: firstSegment.position.y};
  fix(circle, strand, firstSegment, opts.angle, opts.length/2, radiusOffset);
  return strand;
}

function project(point, angle, length){
  return {
    x: point.x + length * Math.cos(angle),
    y: point.y + length * Math.sin(angle)
  };
}


function fix(host, composite, body, pinAngle, pinDist, radiusOffset) {
  const pointA = {
    x: radiusOffset * host.circleRadius * Math.cos(pinAngle),
    y: radiusOffset * host.circleRadius * Math.sin(pinAngle)
  };
  Composite.add(composite, Constraint.create({
    bodyA: host,
    bodyB: body,
    pointA: pointA,
    pointB: { x: 0, y: 0 },
    stiffness: 1,
    length: 0,
    render: {
      visible: false
    }
  }));

  var pin = project(pointA, pinAngle, pinDist);
}

function moveGravity(ts) {
  world.gravity.x =
    0.3 * world.gravity.scale * Math.sin(ts / 2000);
  world.gravity.y =
    1 * world.gravity.scale * (1 + 0.3 * Math.sin(ts / 1500));
  window.requestAnimationFrame(
    (ts) =>
      {
        moveGravity(ts);
      });
}

function incrementScore(inc) {
  const scoreboard = document.getElementById("scoreboard");
  SCORE = SCORE + inc;
  var exclamations = "";
  for (var i = 0; i < (SCORE - 5) / 5; i++) {
    exclamations = exclamations + "!";
  }
  scoreboard.innerHTML = "SCORE: " + SCORE + exclamations;
}

function updateTimer(ts) {
  let maxTime = 10;
  let remaining = maxTime - (ts - HairExists)/1000 | 0;
  let timer = document.getElementById("timer");
  var timerBar = "";
  for (var i = 0; i < remaining / 5; i++) {
    timerBar = timerBar + "|";
  }
  timer.innerHTML = "TIME: " + timerBar;

  if (remaining <= 5) {
    timer.className = "critical blink";
  } else {
    timer.className = "ok";
  }
  if (remaining > 0) {
    window.requestAnimationFrame((ts) => updateTimer(ts));
  } else {
    endGame();
  }
}

function endGame() {
  World.remove(world, Composite.allBodies(world));
  console.log("YOU WIN");
}

// main

// Hack for rounding the corners on constriants so they look like hair, usually they're rectangualar
render.context.lineCap = "round";

// add mouse control
var mouse = Mouse.create(render.canvas);

var mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: {
    stiffness: 0.5,
    render: {
      visible: false
    }
  }
});

function makeCuttable(hair) {
  Events.on(
    mouseConstraint, "mousemove",
    ({source, source: {body}}) => {
      if (body && hair.bodies.includes(body)) {
        cutAbove(hair, body);
      }
    });
  Events.on(
    mouseConstraint, "mousedown",
    ({source, source: {body}}) => {
      if (body && hair.bodies.includes(body)) {
        cutAbove(hair, body);
      }
    });
}


const oceanBackground = Bodies.rectangle(
  0, 0, WIDTH, HEIGHT,
  {
    collisionFilter: { group: getGroup() },
    isStatic: true,
    restitution: 0,
    render: {
      sprite: {
        texture: 'img/ocean.jpg',
        yScale: 1.5,
        xOffset: -0.5,
        yOffset: -0.5,
      }
    }
  });

World.add(world, oceanBackground);

var ground = Bodies.rectangle(400, 590, 800, 40, { isStatic: true, render: {visible: false} });
World.add(world, ground);


const crab = Bodies.circle(
  400, 300, 80,
  {
    frictionAir: 0.8,
    collisionFilter: { group: getGroup() },
    isStatic: true,
    restitution: 0,
    slop: 0.1,
    render: {
      sprite: {
        texture: 'img/blue_crab.jpg',
        xScale: 0.3,
        yScale: 0.3,
        xOffset: -0.03,
        yOffset: 0.08
      }
    }
  });

World.add(world, crab);

function playSnip(){
  var audio = document.createElement("audio");
  audio.src = "snip.mp3";
  audio.addEventListener("ended", function () {
    document.removeChild(this);
  }, false);
  audio.play();
}

function cutAbove(parent, body) {
  var toDelete = parent.constraints.filter((c) => c.bodyB === body);
  if (toDelete.length > 0) {
    incrementScore(1);
  }
  World.remove(parent, toDelete);
  playSnip();
}

World.add(world, mouseConstraint);

// keep the mouse in sync with rendering
render.mouse = mouse;

// fit the render viewport to the scene
Render.lookAt(render, {
  min: { x: 0, y: 0 },
  max: { x: 800, y: 600 }
});

moveGravity(Date.now());


// title screen

const DONT_COLLIDE = {
  category: 0,
  mask: 0
};


const titleScreen = Bodies.rectangle(
  0, 0, WIDTH, HEIGHT,
  {
    collisionFilter: DONT_COLLIDE,
    isStatic: true,
    render: {
      sprite: {
        texture: 'img/title_screen.jpg',
        xOffset: -0.5,
        yOffset: -0.5,
      }
    }
  }
);

World.add(world, titleScreen);

function startFade() {
  // global variables lolllll
  InitialTimestamp = performance.now();
  window.requestAnimationFrame(updateOpacities);
  document.querySelector("#continue").remove();
  document.querySelector("body").removeEventListener("click", startFade);
}

document.querySelector("body").addEventListener("click", startFade);

const FADE_SECONDS = 0.5;

function updateOpacities(ts) {
  // InitialTimestamp is a global variable set in startFade
  let elapsed = (ts - InitialTimestamp)/1000;
  let titleOpacity = Math.max(0, 1 - elapsed / FADE_SECONDS);
  titleScreen.render.opacity = titleOpacity;
  if (titleOpacity <= 0) {
    // we need to wait to add the hairs til click now, since constraints don't have an opacity control
    var hairs = manyHairs(crab, 20);
    World.add(world, hairs);
    HairExists = performance.now();
    hairs.composites.forEach(makeCuttable);
    updateTimer(HairExists);
    // activate scissor cursor
    render.canvas.className += " scissorCursor";
    incrementScore(0);
  } else {
    window.requestAnimationFrame(updateOpacities);
  }
}
