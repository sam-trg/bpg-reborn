/**
 * This is the main server script that provides the API endpoints
 * The script uses the database helper in /src
 * The endpoints retrieve, update, and return data to the page handlebars files
 *
 * The API returns the front-end UI handlebars pages, or
 * Raw json if the client requests it with a query parameter ?raw=json
 */

// Utilities we need
const fs = require("fs");
const path = require("path");

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: false,
});

// Setup our static files
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/", // optional: default '/'
});

// Formbody lets us parse incoming forms
fastify.register(require("@fastify/formbody"));

// View is a templating manager for fastify
fastify.register(require("@fastify/view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});

// Load and parse SEO data
const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

// We use a module for handling database operations in /src
const db = require("./src/sqlite.js");

// GET for boarding-pass
fastify.get('/boarding-pass', async (request, reply) => {
  const { lastname, pnr } = request.query;

  if (!lastname || !pnr) {
    return reply.view('/src/pages/error.hbs', { message: 'Missing PNR or Last Name' });
  }

  try {
    const record = await db.getBoardingPass(lastname, pnr);

    if (!record) {
      return reply.view('/src/pages/error.hbs', { message: 'No boarding pass found for provided details' });
    }
    
    
    function subtractMinutes(timeStr, minutes) {
      const [time, modifier] = timeStr.split(' ');
      let [hours, mins] = time.split(':').map(Number);
      if (modifier === 'PM' && hours !== 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const date = new Date();
      date.setHours(hours, mins - minutes, 0);

      let hrs = date.getHours();
      const mod = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12 || 12;
      const paddedMins = date.getMinutes().toString().padStart(2, '0');

      return `${hrs}:${paddedMins} ${mod}`;
    }
    return reply.view('/src/pages/boarding-pass.hbs', {
      name: `${record.title}. ${record.first_name} ${record.last_name}`,
      seat: record.seat,
      from: record.from_city,
      to: record.to_city,
      date: new Date(record.flight_date).toLocaleDateString('en-GB'),
      gate: record.gate,
      departure: record.boarding_time.slice(0,2)+record.boarding_time.slice(3,5)+" hrs",
      boarding: subtractMinutes(record.boarding_time, 20),
      pnr: record.pnr,
      flight: record.flight_number
    });
  } catch (err) {
    console.error(err);
    return reply.view('/src/pages/error.hbs', { message: 'Server error while retrieving boarding pass' });
  }
});



// Rendering .hbs pages for all other GET reqs

fastify.get("/details", async (request, reply) => {
  return reply.view("/src/pages/details.hbs");
});

fastify.get("/seat-selection", async (request, reply) => {

  return reply.view("/src/pages/seat-selection.hbs");
});


fastify.get("/", async (request, reply) => {

  return reply.view("/src/pages/index.hbs");
});


// Handle index page form submisssion 

// fastify.post('/submit', async (request, reply) => {
//   const { lastname, pnr } = request.body;
//   console.log(`Last Name: ${lastname}, PNR: ${pnr}`);
//   const record = await db.getBoardingPass(lastname, pnr);

//   const params = {
//     lastname,
//     pnr,
//     record,
//     error: record ? null : 'Invalid last name or PNR'
//   };

//   return reply.view('/src/pages/boarding-pass', params);
// });



fastify.post('/generate-boarding-pass', async (request, reply) => {
  const {
    flight_number,
    title,
    first_name,
    last_name,
    from_city,
    to_city,
    flight_date,
    boarding_time,
    gate,
    seat
  } = request.body;

  if (!title || !first_name || !last_name || !flight_date || !boarding_time) {
    return reply.view('/src/pages/error.hbs', { message: 'Missing required fields' });
  }

  let pnr;
  for (let i = 0; i < 5; i++) {
    pnr = generatePNR();
    const existing = await db.getBoardingPass(last_name, pnr);
    if (!existing) break;
    if (i === 4) return reply.view('/src/pages/error.hbs', { message: 'PNR generation failed' });
  }

  console.log('Generated PNR:', pnr);

  try {
    await db.insertBoardingPass({
      pnr,
      flight_number,
      title,
      first_name,
      last_name,
      from_city,
      to_city,
      flight_number,
      flight_date,
      boarding_time,
      gate,
      seat
    });

    return reply.redirect(`/boarding-pass?lastname=${encodeURIComponent(last_name)}&pnr=${pnr}`);
  } catch (err) {
    console.error(err);
    return reply.view('/src/pages/error.hbs', { message: 'Database insert failed' });
  }
});

function generatePNR() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}


// Submitting data on Details

fastify.post('/details-submit', async (request, reply) => {
  const { title, first_name, last_name } = request.body;

  if (!title || !first_name || !last_name) {
    return reply.view('/src/pages/error.hbs', { message: 'Missing name fields' });
  }

  return reply.view('/src/pages/seat-selection.hbs', {
    title,
    first_name,
    last_name
  });
});




/**
 * Home route for the app
 *
 * Return the poll options from the database helper script
 * The home route may be called on remix in which case the db needs setup
 *
 * Client can request raw data using a query parameter
 
//  */
// fastify.get("/", async (request, reply) => {
//   /* 
//   Params is the data we pass to the client
//   - SEO values for front-end UI but not for raw data
//   */
//   let params = request.query.raw ? {} : { seo: seo };

//   // Get the available choices from the database
//   const options = await db.getOptions();
//   if (options) {
//     params.optionNames = options.map((choice) => choice.language);
//     params.optionCounts = options.map((choice) => choice.picks);
//   }
//   // Let the user know if there was a db error
//   else params.error = data.errorMessage;

//   // Check in case the data is empty or not setup yet
//   if (options && params.optionNames.length < 1)
//     params.setup = data.setupMessage;

//   // ADD PARAMS FROM TODO HERE

//   // Send the page options or raw JSON data if the client requested it
//   return request.query.raw
//     ? reply.send(params)
//     : reply.view("/src/pages/index.hbs", params);
// });


 
// Run the server and report out to the logs DO NOT REMOVE THIS PART
fastify.listen(
  { port: process.env.PORT, host: "0.0.0.0" },
  function (err, address) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Your app is listening on ${address}`);
  }
);
