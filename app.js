const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDb = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3009/");
    });
  } catch (e) {
    console.log(`Database Error ${e.message}`);
  }
};

initializeDb();

const stateSnakeToCamel = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const districtSnakeToCamel = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const reportSnakeToCamel = (dbObject) => {
  return {
    totalCases: dbObject.cases,
    totalCured: dbObject.cured,
    totalActive: dbObject.active,
    totalDeaths: dbObject.deaths,
  };
};

//API-1 Returns list of all states in the state table

app.get("/states/", async (request, response) => {
  const stateNames = `SELECT * FROM state ORDER BY state_id;`;

  const allStatesArray = await db.all(stateNames);
  response.send(
    allStatesArray.map((eachObject) => stateSnakeToCamel(eachObject))
  );
});

//API-2 Returns a state based on the state ID

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `SELECT * FROM state WHERE state_id = ${stateId};`;

  const stateDetails = await db.get(stateQuery);
  response.send(stateSnakeToCamel(stateDetails));
});

// API-3 Create a district in the district table, district_id is auto-incremented

app.post("/districts/", async (request, response) => {
  const newDistrict = request.body;

  const { districtName, stateId, cases, cured, active, deaths } = newDistrict;
  const addingNewDistrict = `
     INSERT INTO district
      (district_name, state_id, cases, cured, active, deaths)
     VALUES
      ('${districtName}',${stateId},${cases},${cured},
      ${active}, ${deaths})`;

  const dbResponse = await db.run(addingNewDistrict);
  const newDistrictDetails = dbResponse.lastID;
  response.send("District Successfully Added");
});

//API-4 Returns a district based on the district ID

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;

  const districtDetails = `SELECT * FROM 
  district WHERE district_id = ${districtId}`;
  const districtArray = await db.get(districtDetails);
  response.send(districtSnakeToCamel(districtArray));
});

//API-5 Deletes a district from the district table based on the district ID

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;

  const removeDistrict = `DELETE FROM district WHERE district_id = ${districtId}`;

  await db.run(removeDistrict);
  response.send("District Removed");
});

//API-6 Update the district based on the district_id

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;

  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const updateDistrictDetails = `
      UPDATE district SET 
              district_name = '${districtName}',
              state_id = ${stateId},
              cases = ${cases},
              cured = ${cured},
              active = ${active},
              deaths = ${deaths}
     WHERE district_id = ${districtId}`;
  await db.run(updateDistrictDetails);
  response.send("District Details Updated");
});

//API-7 Returns the statistics of a specific state based on state ID

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `
       SELECT SUM(cases) as cases ,SUM(cured) as cured,
       SUM(active) as active,SUM(deaths) as deaths
    FROM district
    WHERE 
        state_id = ${stateId}`;

  const stateDetails = await db.get(stateQuery);
  const resultReport = reportSnakeToCamel(stateDetails);
  response.send(resultReport);
});

//API-8 Returns an object containing the state name of a
// district based on the district ID

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateQuery = `
    SELECT state_name FROM state NATURAL JOIN district
     WHERE district_id = ${districtId}`;

  const stateName = await db.get(stateQuery);
  response.send(stateSnakeToCamel(stateName));
});

module.exports = app;
