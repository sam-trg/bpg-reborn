/**
 * Module handles database management
 *
 * Server API calls the methods in here to query and update the SQLite database
 */

// Utilities we need
const fs = require("fs");

// Initialize the database
const dbFile = "./.data/details.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const dbWrapper = require("sqlite");
let db;

/* 
We're using the sqlite wrapper so that we can make async / await connections
- https://www.npmjs.com/package/sqlite
*/
dbWrapper
  .open({
    filename: dbFile,
    driver: sqlite3.Database,
  })
  .then(async (dBase) => {
    db = dBase;

    // We use try and catch blocks throughout to handle any database errors
    try {
      // The async / await syntax lets us write the db operations in a way that won't block the app
      if (!exists) {
        // Database doesn't exist yet - create boarding_passes and details tables
        await db.run(
          "CREATE TABLE BoardingPasses (id INTEGER PRIMARY KEY AUTOINCREMENT,pnr TEXT UNIQUE NOT NULL,title TEXT CHECK(title IN ('Mr', 'Mrs', 'Ms', 'Dr')),first_name TEXT NOT NULL,last_name TEXT NOT NULL,seat TEXT,gate TEXT,flight_date TEXT NOT NULL,boarding_time TEXT NOT NULL,flight_number TEXT NOT NULL,from_city TEXT NOT NULL,to_city TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP)"
        );

        console.log("BoardingPasses table created.");
      } else {
        //console.log(await db.all("SELECT * from BoardingPasses"));
      }
    } catch (dbError) {
      console.error(dbError);
    }
  });

// Our server script will call these methods to connect to the db
module.exports = {
  /**
   * Get the options in the database
   *
   * Return everything in the Choices table
   * Throw an error in case of db connection issues
   */
  getBoardingPass: async (lastname, pnr) => {
    try {
      return await db.get(
        "SELECT * FROM BoardingPasses WHERE last_name = ? AND pnr = ?",
        [lastname, pnr]
      );
    } catch (dbError) {
      console.error(dbError);
    }
  },

  insertBoardingPass: async ({
  title,
  first_name,
  last_name,
  from_city,
  to_city,
  flight_number,
  flight_date,
  boarding_time,
  gate,
  seat,
  pnr
}) => {
  try {
    return await db.run(
      `INSERT INTO BoardingPasses 
        (title, first_name, last_name, from_city, to_city, flight_number, flight_date, boarding_time, gate, seat, pnr)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, first_name, last_name, from_city, to_city, flight_number, flight_date, boarding_time, gate, seat, pnr]
    );
  } catch (dbError) {
    console.error("Insert failed:", dbError);
    throw dbError;
  }
}


  /**
   * Process a user vote
   *
   * Receive the user vote string from server
   * Add a log entry
   * Find and update the chosen option
   * Return the updated list of votes
   */
//   processVote: async (vote) => {
//     Insert new Log table entry indicating the user choice and timestamp
//     try {
//       Check the vote is valid
//       const option = await db.all(
//         "SELECT * from Choices WHERE language = ?",
//         vote
//       );
//       if (option.length > 0) {
//         Build the user data from the front-end and the current time into the sql query
//         await db.run("INSERT INTO Log (choice, time) VALUES (?, ?)", [
//           vote,
//           new Date().toISOString(),
//         ]);

//         Update the number of times the choice has been picked by adding one to it
//         await db.run(
//           "UPDATE Choices SET picks = picks + 1 WHERE language = ?",
//           vote
//         );
//       }

//       Return the choices so far - page will build these into a chart
//       return await db.all("SELECT * from Choices");
//     } catch (dbError) {
//       console.error(dbError);
//     }
//   },

};
