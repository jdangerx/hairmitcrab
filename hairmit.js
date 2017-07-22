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
var engine = Engine.create({ constraintIterations: 1, positionIterations: 1, velocityIterations: 1 }),
    world = engine.world;

// create renderer
var render = Render.create({
  element: document.body,
  engine: engine,
  options: {
    width: 800,
    height: 600,
    wireframes: false,
    background: '#9999cc'
  }
});

Render.run(render);

// create runner
var runner = Runner.create();
Runner.run(runner, engine);


function manyHairs(body, nHairs) {
  var hairs = Composite.create();
  for (var i = 0; i < nHairs; i++) {
    const angle = -Math.PI/nHairs * (i+1.5) * 0.75;
    Composite.add(hairs, oneHair(body, {angle}));
  }
  return hairs;
}

// TODO where to put this
world.gravity.scale = 0.01;

const GROUPS =[
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
    overlap: 0.4,
  };
  Object.assign(opts, hairOpts);
  const group = getGroup();
  // make actual hair bodies
  const radius = circle.circleRadius;
  const radiusOffset = 1.1 + Math.random() * 0.2;
  const start = {
    x: radiusOffset * radius * Math.cos(opts.angle),
    y: radiusOffset * radius * Math.sin(opts.angle)
  };
  var strand = Composites.stack(
    start.x,
    start.y,
    opts.segmentsPerHair,
    1,
    -opts.length * opts.overlap,
    0, (x, y) =>
      Bodies.rectangle(x, y, opts.length, opts.width, {
      collisionFilter: { group },
      chamfer: 5,
      frictionAir: 1,
      friction: 1,
      restitution: 0,
      slop: 0.3,
      render: {
        fillStyle: 'brown',
        lineWidth: 0
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
  Composites.chain(strand, 0.3, 0, -0.3, 0, {
    label: "pin",
    length: 0,
    stiffness: 0.9,
    angularStiffness: opts.angularStiffness,
    render: {
      visible: false
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
    stiffness: 0.5,
    length: 0,
    render: {
      visible: false
    }
  }));

  var pin = project(pointA, pinAngle, pinDist);
}

function moveGravity(ts) {
  world.gravity.x =
    30 * world.gravity.scale * Math.sin(ts / 2000);
  world.gravity.y =
    100 * world.gravity.scale * (1 + 0.3 * Math.sin(ts / 1500));
  window.requestAnimationFrame(
    (ts) =>
      {
        moveGravity(ts);
      });
}

// main

var ground = Bodies.rectangle(350, 590, 800, 40, { isStatic: true });
World.add(world, ground);

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

// TODO attach hairs to this in a circle
const crab = Bodies.circle(
  350, 300, 80,
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

var hairs = manyHairs(crab, 20);
World.add(world, hairs);
hairs.composites.forEach(makeCuttable);

// TODO everything in the world is cuttable right now
// this is fine because for now there is only hair
// refactor this if we ever add anything else

function cutAbove(parent, body) {
  var toDelete = parent.constraints.filter((c) => c.bodyB === body);
  World.remove(parent, toDelete);
}

World.add(world, mouseConstraint);

// keep the mouse in sync with rendering
render.mouse = mouse;

// fit the render viewport to the scene
Render.lookAt(render, {
  min: { x: 0, y: 0 },
  max: { x: 700, y: 600 }
});

moveGravity(Date.now());
