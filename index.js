import { BigNumber } from "bignumber.js";
import { employees, parkingRates, fuelPricePerUnit } from "./params";

// I don't trust native JS number precision & management, enter BigNumber.js
BigNumber.config({ DECIMAL_PLACES: 5, ROUNDING_MODE: BigNumber.ROUND_HALF_UP });

/**
 * Welcome to Jurassic Parking.
 * The service offers parking in addition to refueling to vehicles that require it,
 * there are X employees who work on comission and get paid different rates.
 *  - [x] Small cars pay a flat rate of $25 for parking and large vehicles pay $35.
 *  - [x] Every car with 10% or less fuel, will be refueled to maximum capacity
 *        and charged the fuel amount in addition to the parking fee.
 *  - [x] Employees may be paid different commission rates.
 *  - [x] Fuel has a fixed rate of $1.75/litre.
 *  - [x] The system is responsible for assigning the workload 'equally'
 *        between the employees in a way that favours profit.
 */
export const jurassicParking = async (queue = {}) => {
  const servicedQueue = await calculateServiceFees(queue);
  const jobLoads = await assignJobLoads(employees, servicedQueue);
  const goToTheCheckout = await addEmployeeCommission(jobLoads);
  const result = await makeMePretty(goToTheCheckout);
  return result;
};

/**
 * given a queue of cars, calculate its service fees
 * based on size and wether it needs refueling.
 * returns a queue of cars with service fees added.
 */
export const calculateServiceFees = async (queue) => {
  return queue.map((car) => {
    // get matching parking rate for car size
    const parkingRate = toBN(
      parkingRates.filter((x) => x.size === car.size)[0].rate
    );
    const fuelData = calculateUnitsToFuel(car);
    const { unitsToFuel, totalFuelPrice } = fuelData;
    const totalToPay = toBN(totalFuelPrice).plus(parkingRate);
    return {
      ...car,
      fuelAdded: unitsToFuel,
      netTotal: totalToPay,
    };
  });
};

/**
 * given a car, calculate if it has to be refueled,
 * the units to fuel, and what the fueling fees are (if applicable).
 * returns fueling data to service fees method.
 */
export const calculateUnitsToFuel = (car) => {
  let unitsToFuel = 0;
  let totalFuelPrice = 0;
  const { capacity, level } = car.fuel;

  const carLevel = toBN(level);
  const carCapacity = toBN(capacity);
  const carFuelPricePerUnit = toBN(fuelPricePerUnit);

  const fuelPct = carLevel.multipliedBy(100);
  // Negative percentages will be considered invalid and skipped while refueling.
  if (fuelPct.isLessThanOrEqualTo(10) && fuelPct.isGreaterThanOrEqualTo(0)) {
    unitsToFuel = carCapacity.minus(carCapacity.multipliedBy(carLevel));
    totalFuelPrice = unitsToFuel.multipliedBy(carFuelPricePerUnit);
  }
  return { unitsToFuel, totalFuelPrice };
};

/**
 * Given a pool of employees and a queue of jobs with fees,
 * figures out a way to distribute the jobs (mostly) evenly among employees,
 * in a way that maximises profit, and then assigns such jobs
 * returns a queue of processed jobs with employee data.
 */
export const assignJobLoads = async (employees, queue) => {
  // Sort employees, highest earners topmost.
  const sortedEmployees = employees.sort((a, b) => {
    return b.commissionPct - a.commissionPct;
  });

  // Sort jobs in queue, highest value topmost.
  const sortedQueue = queue.sort((a, b) => {
    return b.netTotal.minus(a.netTotal);
  });

  const totalJobs = sortedQueue.length;
  const totalEmployees = sortedEmployees.length;

  // Get the jobs/employee ratio
  const jobsPerEmployee = totalJobs / totalEmployees;
  // If there are more jobs than employees, peg to 1 job/employee, otherwise round down to nearest integer.
  // This may produce overflows and general lack of evenness. Will deal with that later.
  const chunkSize = jobsPerEmployee > 1 ? Math.floor(jobsPerEmployee) : 1;
  const jobLoads = sortedEmployees.map((emp) => {
    return { ...emp, numJobs: chunkSize };
  });

  const isEvenQueue = !totalJobs % totalEmployees === 0
  // Cannot distribute jobs evenly among all employees, weight queue towards highest earner
  if (!isEvenQueue) {
    const leftoverJobs = totalJobs - chunkSize * totalEmployees;
    if (leftoverJobs > 0) {
      // Note/Hack: Because here I'm assigning jobs to the very first employee, the distribution is not 'perfectly' even.
      // i.e 10 jobs among 4 employees will give a 4-2-2-2 distribution instead of 3-3-2-2, which will be nicer.
      // Still maximises profit. Will fix if hired.
      jobLoads[0].numJobs += leftoverJobs;
    }
  }

  // Each worker has a number of assigned jobs. Consume queue.
  let jobs = [];
  for (const emp of jobLoads) {
    const empJobs = sortedQueue.splice(0, emp.numJobs);
    // aggregate data for easier manipulation later.
    for (const job of empJobs) {
      jobs.push({ ...emp, ...job });
    }
    // Ran out of jobs, we're done here.
    if (sortedQueue.length === 0) {
      break;
    }
  }
  // Sanity check: by the end of this process, job queue MUST be empty. Freak out if not.
  if (sortedQueue.length > 0) {
    throw new Error("UNASSIGNED JOBS STILL IN QUEUE!!!!");
  }
  return jobs;
};

/**
 * Given a queue of jobs with assigned employees to it,
 * calculates the commission to be paid to each employee and add it to bill.
 * returns a service queue with a consolidated fee + employee commission.
 */
export const addEmployeeCommission = async (jobLoads) => {
  return jobLoads.map((job) => {
    let commissionToPay = 0;
    const { netTotal, commissionPct } = job;
    const jobNetTotal = toBN(netTotal);
    const empCommission = toBN(commissionPct);
    // commissions can be more than 100% for superstar employees, but not less than 0%.
    if (empCommission.isLessThan(0)) {
      console.warn(
        `Commission percentage ${empCommission} out of range for ${job.name}. Will skip commission payment.`
      );
    } else {
      commissionToPay = jobNetTotal.times(empCommission).dividedBy(100);
    }
    const totalToPay = jobNetTotal.plus(toBN(commissionToPay));
    return { ...job, totalToPay };
  });
};

/**
 * Basic formatting function to prune & display the data in a human readable manner.
 */
export const makeMePretty = async (jobLoads) => {
  return jobLoads.map((job) => {
    const { licencePlate, name, fuelAdded, totalToPay } = job;
    return {
      licencePlate,
      employee: name,
      fuelAdded: toBN(fuelAdded).toNumber(),
      price: toBN(totalToPay).toNumber(),
    };
  });
};

/**
 * Helper. I don't want instances of BigNumber all over the codebase.
 * */
export const toBN = (thing) => new BigNumber(thing);
