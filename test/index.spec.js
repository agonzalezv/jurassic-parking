import { expect } from "chai";
import * as fn from "../index";
import { queue } from "./fixtures";

describe("Jurassic Parking", async function () {
  it("should do a test run", async function () {
    const result = await fn.jurassicParking(queue);
    console.log(result);
  });

  it("should calculate service fees", async function () {
    const testCars = [
      {
        licencePlate: "A",
        size: "large",
        fuel: { capacity: 10, level: 0.1 },
      },
      {
        licencePlate: "B",
        size: "small",
        fuel: { capacity: 10, level: 0.1 },
      },
      {
        licencePlate: "C",
        size: "large",
        fuel: { capacity: 10, level: -1.1 },
      },
      {
        licencePlate: "D",
        size: "large",
        fuel: { capacity: 10, level: 0.9 },
      },
    ];
    const result = await fn.calculateServiceFees(testCars);

    // car is at 10% of capacity, add 9 litres of fuel (90% of 10)
    expect(+result[0].fuelAdded).to.equal(9);
    // large car + fuel fees
    expect(+result[0].netTotal).to.equal(35 + 9 * 1.75);
    // small car + fuel fees
    expect(+result[1].netTotal).to.equal(25 + 9 * 1.75);
    // negative percentage, dont't refuel
    expect(+result[2].fuelAdded).to.equal(0);
    // percentage is > 10, dont't refuel
    expect(+result[3].fuelAdded).to.equal(0);
  });

  it("should assign job loads", async function () {
    const queue = [
      {
        licencePlate: "D",
        size: "large",
        fuel: { capacity: 10, level: 0.9 },
        fuelAdded: fn.toBN(0),
        netTotal: fn.toBN(3.5),
      },
      {
        licencePlate: "A",
        size: "large",
        fuel: { capacity: 10, level: 0.1 },
        fuelAdded: fn.toBN(9),
        netTotal: fn.toBN(50.75),
      },
      {
        licencePlate: "C",
        size: "large",
        fuel: { capacity: 10, level: 1.1 },
        fuelAdded: fn.toBN(0),
        netTotal: fn.toBN(35),
      },
      {
        licencePlate: "B",
        size: "small",
        fuel: { capacity: 10, level: 0.1 },
        fuelAdded: fn.toBN(9),
        netTotal: fn.toBN(40.75),
      },
    ];

    const employees = [
      {
        name: "Ian Malcolm",
        commissionPct: 11,
      },
      {
        name: "Alan Grant",
        commissionPct: 15,
      },
    ];
    const result = await fn.assignJobLoads(employees, queue);
    // 2 jobs for emp #1
    expect(result[0].numJobs).to.equal(2);
    // 2 jobs for emp #2
    expect(result[result.length - 1].numJobs).to.equal(2);
    // jobs assigned to different people
    expect(result[result.length - 1].name).not.to.equal(result[0].name);
    // queue should have been sorted - highest job must be on top
    expect(+result[0].netTotal).to.equal(50.75);
    // queue should have been sorted - highest paid employee should be on top
    expect(+result[0].commissionPct).to.equal(15);
    // queue should have been sorted - lowest job must be on bottom
    expect(+result[result.length - 1].netTotal).to.equal(3.5);
    // queue should have been sorted - lowest paid employee should be on bottom
    expect(+result[result.length - 1].commissionPct).to.equal(11);
  });

  it("should calculate employee commission", async function () {
    const jobLoads = [
      {
        name: "Alan Grant",
        commissionPct: 15,
        numJobs: 2,
        licencePlate: "A",
        size: "large",
        fuel: { capacity: 10, level: 0.1 },
        fuelAdded: fn.toBN(9),
        netTotal: fn.toBN(50.75),
      },
      {
        name: "Ian Malcolm",
        commissionPct: 11,
        numJobs: 2,
        licencePlate: "C",
        size: "large",
        fuel: { capacity: 10, level: 1.1 },
        fuelAdded: fn.toBN(0),
        netTotal: fn.toBN(35),
      },
    ];

    const result = await fn.addEmployeeCommission(jobLoads);

    // total to pay matches an independent calculation.
    expect(+result[0].totalToPay).to.equal(50.75 + (50.75 * 15) / 100);
    expect(+result[1].totalToPay).to.equal(35 + (35 * 11) / 100);
  });

  it("should make things pretty", async function () {
    const jobLoads = [
      {
        name: "Alan Grant",
        commissionPct: 15,
        numJobs: 2,
        licencePlate: "A",
        size: "large",
        fuel: { capacity: 10, level: 0.1 },
        fuelAdded: "9",
        netTotal: "50.75",
        totalToPay: "58.3625",
      },
      {
        name: "Ian Malcolm",
        commissionPct: 11,
        numJobs: 2,
        licencePlate: "C",
        size: "large",
        fuel: { capacity: 10, level: 1.1 },
        fuelAdded: "0",
        netTotal: "35",
        totalToPay: "38.85",
      },
    ];
    const result = await fn.makeMePretty(jobLoads);
    expect(result).to.deep.equal([
      {
        licencePlate: 'A',
        name: 'Alan Grant',
        fuelAdded: 9,
        price: 58.3625
      },
      {
        licencePlate: 'C',
        name: 'Ian Malcolm',
        fuelAdded: 0,
        price: 38.85
      }
    ])
  });
});
