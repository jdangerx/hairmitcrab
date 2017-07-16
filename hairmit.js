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
    hairStiffness = 0.7;

world.gravity.scale = 0.01;

function oneHair(start, hairOpts) {
  hairOpts = hairOpts || {};
  // make actual hair bodies
  var strand = Composites.stack(start.x, start.y, segmentsPerHair, 1, -20, 0, function(x, y) {
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
  // attach segments to each other
  Composites.chain(strand, 0.45, 0, -0.45, 0, {
    stiffness: 0.9,
    length: 0,
    angularStiffness: hairAngularStiffness,
    render: {
      strokeStyle: '#4a485b'
    }
  });
  // make them tense
  Composites.chain(strand, 0, 0, 0, 0, {
    stiffness: hairStiffness,
    length: length,
    render: {
      strokeStyle: '#4a485b'
    }
  });
  // fix the first one
  var firstSegment = strand.bodies[0];
  var startPoint = {x: firstSegment.position.x,
                    y: firstSegment.position.y};
  fix(strand, firstSegment, Math.PI/3, length/2);
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


var start = {x: 350, y: 160};

var strand = oneHair(start);
World.add(world, strand);



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

// Events.on(mouseConstraint, "mousedown",
//           ({source: {body}}) => {
//             if (body) {
//               World.remove(strand, [body], true);
//               removeAllConstraints(strand, body);
//             }
//           });

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
