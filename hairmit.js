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

// add bodies
var group = Body.nextGroup(true),
    length = 50,
    width = 15,
    segmentsPerHair = 10,
    hairAngularStiffness = 0.7,
    hairStiffness = 0.3;

var pendulum = Composites.stack(350, 160, segmentsPerHair, 1, -20, 0, function(x, y) {
  return Bodies.rectangle(x, y, length, width, {
    collisionFilter: { group: group },
    frictionAir: 0,
    chamfer: 5,
    render: {
      fillStyle: 'transparent',
      lineWidth: 1,
      strokeStyle: '#41485b',
    }
  });
});

world.gravity.scale = 0.01;

Composites.chain(pendulum, 0.45, 0, -0.45, 0, {
  stiffness: 0.9, 
  length: 0,
  angularStiffness: hairAngularStiffness,
  render: {
    strokeStyle: '#4a485b'
  }
});

Composites.chain(pendulum, 0, 0, 0, 0, { 
  stiffness: hairStiffness,
  length: length,
  render: {
    strokeStyle: '#4a485b'
  }
});

Composite.add(pendulum, Constraint.create({
  bodyB: pendulum.bodies[0],
  pointB: { x: -length * 0.42, y: 0 },
  pointA: { x: pendulum.bodies[0].position.x - length * 0.42, y: pendulum.bodies[0].position.y },
  stiffness: 1,
  length: 0,
  angularStiffness: 1,
  render: {
    strokeStyle: '#4a485b'
  }
}));

Composite.add(pendulum, Constraint.create({
  bodyB: pendulum.bodies[0],
  pointB: { x: length * 0.42, y: 0 },
  pointA: { x: pendulum.bodies[0].position.x - length * 0.42, y: pendulum.bodies[0].position.y + width},
  stiffness: 1,
  length: length * 0.8,
  render: {
    strokeStyle: '#4a485b'
  }
}));

var upperArm = pendulum.bodies[0];
var lowerArm = pendulum.bodies[1];

Body.rotate(upperArm, -Math.PI * 0.3, {
  x: upperArm.position.x - 100,
  y: upperArm.position.y
});

Body.rotate(lowerArm, -Math.PI * 0.3, {
  x: lowerArm.position.x - 100,
  y: lowerArm.position.y
});

World.add(world, pendulum);

// add mouse control
var mouse = Mouse.create(render.canvas),
    mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false
        }
      }
    });

Events.on(mouseConstraint, "mousedown",
          ({source: {body}}) => {
            if (body) {
              World.remove(pendulum, [body], true);
              removeAllConstraints(pendulum, body);
            }
          });

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
