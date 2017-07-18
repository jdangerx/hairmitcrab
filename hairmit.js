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
var engine = Engine.create(),
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

var GROUP = Body.nextGroup(true);

function manyHairs(follicles) {
  var hairs = Composite.create();
  follicles.forEach(({start, angle}) => {
    Composite.add(hairs, oneHair(start, {angle: angle}));
  });
  return hairs;
}

// TODO where to put this
world.gravity.scale = 0.01;

function oneHair(start, hairOpts) {
  var opts = {
    length: 30,
    width: 15,
    angle: Math.PI,
    segmentsPerHair: 10,
    angularStiffness: 0.95,
    stiffness: 0.2,
    kinkiness: 0.3,
    overlap: 0.4,
  };
  Object.assign(opts, hairOpts);
  // make actual hair bodies
  var strand = Composites.stack(
    start.x,
    start.y,
    opts.segmentsPerHair,
    1,
    -opts.length * opts.overlap,
    0, (x, y) =>
      Bodies.rectangle(x, y, opts.length, opts.width, {
      collisionFilter: { group: GROUP },
      frictionAir: 0.1,
      chamfer: 5,
      render: {
        fillStyle: 'pink',
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
  Composites.chain(strand, 0.4, 0, -0.4, 0, {
    label: "pin",
    length: 0,
    stiffness: 1,
    angularStiffness: opts.angularStiffness,
    render: {
      visible: false
    }
  });
  // make them tense
  Composites.chain(strand, 0, 0, 0, 0, {
    label: "tension",
    length: opts.length * (1 - opts.overlap/2) * (1 - opts.kinkiness),
    stiffness: opts.stiffness,
    damping: 0.05,
    anchor: false,
    render: {
      visible: false
    }
  });
  // fix the first one
  var firstSegment = strand.bodies[0];
  var startPoint = {x: firstSegment.position.x,
                    y: firstSegment.position.y};
  fix(strand, firstSegment, opts.angle, opts.length/2);
  return strand;
}

function project(point, angle, length){
  return {
    x: point.x + length * Math.cos(angle),
    y: point.y + length * Math.sin(angle)
  };
}


function fix(parent, body, pinAngle, pinDist) {

  Composite.add(parent, Constraint.create({
    bodyB: body,
    pointB: { x: 0, y: 0 },
    pointA: {x: body.position.x, y: body.position.y},
    stiffness: 1,
    length: 0,
    render: {
      visible: false
    }
  }));

  var pin = project(body.position, pinAngle, pinDist);

  Composite.add(parent, Constraint.create({
    bodyB: body,
    pointB: { x: -pinDist, y: 0 },
    pointA: pin,
    stiffness: 1,
    length: 0,
    render: {
      visible: false
    }
  }));
}

function moveGravity(ts) {
  world.gravity.x =
    3 * world.gravity.scale * Math.sin(ts / (2000 + 200 * Math.random()));
  world.gravity.y =
    10 * world.gravity.scale * (1 + 0.3 * Math.sin(ts / (1500 + 200 * Math.random())));
  window.requestAnimationFrame(
    (ts) =>
      {
        moveGravity(ts);
      });
}

// main

var follicles = [];
var n_hairs = 24;
for (var i = 0; i < n_hairs; i++) {
  follicles.push(
    {
      start: {x: 250 + 300 / n_hairs * i, y: 185 + Math.random() * 30},
      angle: Math.PI * i / n_hairs
    }
  );
}

var ground = Bodies.rectangle(350, 590, 800, 40, { isStatic: true });
World.add(world, ground);

var hairs = manyHairs(follicles);
World.add(world, hairs);

// add mouse control
var mouse = Mouse.create(render.canvas);

var mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: {
    stiffness: 0.0,
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
  350, 300, 100,
  {
    frictionAir: 0.8,
    group: GROUP,
    render: {
      sprite: {
        texture: 'img/blue_crab.jpg',
        xScale: 0.3,
        yScale: 0.3
      }
    }
  });

World.add(world, crab);

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
