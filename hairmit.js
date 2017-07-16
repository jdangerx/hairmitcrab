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
    background: '#0f0f13'
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
    segmentsPerHair: 20,
    angularStiffness: 0.95,
    stiffness: 0.6,
    kinkiness: 0.0,
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
        fillStyle: 'transparent',
        lineWidth: 1,
        strokeStyle: '#41485b'
      }
    })
  );

  strand.bodies.forEach(
    (body, i) => Body.setDensity(body, body.density * Math.pow(0.95, i))
  );
  strand
    .constraints
    .filter(({label}) => label === "pin")
    .forEach((pin, i) => pin.angularStiffness = Math.pow(0.98, i)) ;
  // attach segments to each other
  Composites.chain(strand, 0.4, 0, -0.4, 0, {
    label: "pin",
    length: 0,
    stiffness: 1,
    damping: 0.5,
    angularStiffness: opts.angularStiffness,
    render: {
      strokeStyle: '#4a485b'
    }
  });
  // make them tense
  Composites.chain(strand, 0, 0, 0, 0, {
    label: "tension",
    length: opts.length * (1 - opts.overlap/2) * (1 - opts.kinkiness),
    stiffness: opts.stiffness,
    damping: 0.5,
    anchor: false,
    render: {
      strokeStyle: '#4a485b'
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
      strokeStyle: '#4a485b'
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
      strokeStyle: '#4a485b'
    }
  }));
}

// main


var follicles = [
  {start: {x: 150, y: 160}, angle: Math.PI*0.3},
  {start: {x: 50, y: 200}, angle: Math.PI*0.6},
  {start: {x: 200, y: 200}, angle: Math.PI*0.9},
];

var ground = Bodies.rectangle(350, 590, 800, 20, { isStatic: true });
World.add(world, ground);

var hairs = manyHairs(follicles);
World.add(world, hairs);



// add mouse control
var mouse = Mouse.create(render.canvas);

var mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: {
    stiffness: 0.2,
    render: {
      visible: false
    }
  }
});

function makeCuttable(hair) {
  Events.on(
    mouseConstraint, "mousemove",
    ({source: {body}}) => {
      if (body && hair.bodies.includes(body)) {
        World.remove(hair, [body], true);
        removeAllConstraints(hair, body);
      }
    });
}

hairs.composites.forEach(makeCuttable);

// TODO everything in the world is cuttable right now
// this is fine because for now there is only hair
// refactor this if we ever add anything else

function removeAllConstraints(parent, body) {
  var toDelete = parent.constraints.filter((c) => (c.bodyA === body) || (c.bodyB === body));
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
