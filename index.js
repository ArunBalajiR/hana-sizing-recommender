var _ = require("underscore");
const fs = require('fs');
const xlsx = require('xlsx');
var rfc = require("node-rfc");
var json2xls = require("json2xls");
const Scripter = require('./helper');


const clientAK4 = new rfc.Client({
    user: "KAAR-3090",
    passwd: "KTern@2019",
    ashost: "172.17.19.18",
    sysnr: "00",
    client: "210",
    lang: "EN",
});

const clientMV4 = new rfc.Client({
    user: "K2225",
    passwd: "Kaar@54321",
    ashost: "172.17.19.22",
    sysnr: "00",
    client: "100",
    lang: "EN",
});

//CONNECTION 
async function connectToSAP(client) {
    try {
        await client.connect();
        console.log("Connected to SAP!");
    } catch (error) {
        console.error("SAP Connection Error:", error);
        throw error;
    }
}

// Close connection (when done with all calls)
function closeSAPConnection(client) {
    client.close();
    console.log("SAP connection closed.");
}

function callRFC(functionName, params = {}) {
    return new Promise((resolve, reject) => {
        // clientMV4.invoke(functionName, params, (err, result) => {
            clientAK4.invoke(functionName, params, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

async function fetchSystemInfo() {
    try {
        const systemInfo = await callRFC("RFC_SYSTEM_INFO");
        return systemInfo;
    } catch (error) {
        console.error("Failed to fetch system info:", error);
    }
}

async function getTableSize(tableName) {
    //SIZE BYTE MAPPING
    const sizeChart = {
        "C": 1,
        "N": 1,
        "D": 8,
        "T": 8,
        "X": 1,
        "P": 8,
        "I": 4,
        "F": 8
    };


    let tableTypeOption = [{
        TEXT: "TABNAME = '" + tableName + "'"
    }]


    const tableTypes = await clientMV4.call('RFC_READ_TABLE', {
        QUERY_TABLE: 'DD03L',
        DELIMITER: '|',
        OPTIONS: tableTypeOption
    });

    const tableRecordCount = await callRFC("EM_GET_NUMBER_OF_ENTRIES",
        {
            IT_TABLES: [{ TABNAME: `${tableName}` }],
        });

    let fields = tableTypes.FIELDS;
    // Calculate Row Size
    let rowSize = fields.reduce((total, field) => {
        const type = field.TYPE;
        const length = parseInt(field.LENGTH, 10);
        const byteSize = sizeChart[type] || 0;

        // If type is C or N, multiply by length (character-based)
        if (type === 'C' || type === 'N') {
            return total + (length * byteSize);
        }
        // Otherwise, use the fixed byte size for the data type
        else {
            return total + byteSize;
        }
    }, 0);


    let tableRowLength = tableRecordCount.IT_TABLES[0].TABROWS;
    console.log(`${tableName} : ${tableRowLength * rowSize}`);
    let tableSize = tableRowLength * rowSize;
    return tableSize;
}

function getLast12Months() {
    const dates = [];
    const today = new Date();

    // Set today's date to the first day of the current month
    today.setDate(1);

    // Loop to get the first day of each month for the last 12 months (including current month)
    for (let i = 0; i < 12; i++) {
        // Create a new date by subtracting i months from the current month
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);

        // Format year as 4-digit and month as 2-digit (pad with zero if needed)
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed in JS
        const formattedDate = `${year}${month}01`;

        dates.push(formattedDate);
    }

    return dates;
}

function getCurrentMonth() {
    const today = new Date();
    today.setDate(1);
    // Create a new date by subtracting i months from the current month
    const d = new Date(today.getFullYear(), today.getMonth(), 1);

    // Format year as 4-digit and month as 2-digit (pad with zero if needed)
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const formattedDate = `${year}${month}01`;
    return formattedDate;
}

function generateLast30Days() {
    // Get today's date
    const today = new Date();

    // Array to hold all the date strings
    const dateStrings = [];

    // Loop to get the last 30 days including today
    for (let i = 0; i < 30; i++) {
        // Create a new date by subtracting i days from today
        const currentDate = new Date();
        currentDate.setDate(today.getDate() - i);

        // Format the date as YYYYMMDD and add to array
        const dateString =
            currentDate.getFullYear().toString() +
            (currentDate.getMonth() + 1).toString().padStart(2, '0') +
            currentDate.getDate().toString().padStart(2, '0');

        dateStrings.push(dateString);
    }

    return dateStrings;
}



// ------------------- MAIN FUNCTION -------------------
(async () => {
    try {
        // await connectToSAP(clientMV4);
        await connectToSAP(clientAK4);


        //SYSTEM INFO
        // let systemInfo = await fetchSystemInfo();
        // console.log(systemInfo);

        //READ TABLE RECORD COUNT
        // const tableRecordCount = await callRFC("EM_GET_NUMBER_OF_ENTRIES",
        //     {
        //         IT_TABLES: [{ TABNAME: "MATDOC" }],
        //     });
        // console.log(tableRecordCount);

        //READ TABLE
        // const tableData = await callRFC("RFC_READ_TABLE", {
        //     QUERY_TABLE: "MATDOC",
        //     DELIMITER: "|",
        //     ROWCOUNT: 1,
        //     FIELDS: [{ FIELDNAME: "MATNR" }, { FIELDNAME: "WERKS" }, { FIELDNAME: "MENGE" }]
        // });
        // console.log("Table Data:", tableData);

        // let acdoca = await getTableSize('ACDOCA');
        // let matdoc = await getTableSize('MATDOC');
        // let bsis = await getTableSize('BSIS');
        // let vbak = await getTableSize('VBAK');
        // let mldoc = await getTableSize('MLDOC');
        // console.log("ACDOCA,MATDOC,BSIS,VBAK,MLDOC")

        //GETTING PEAK FACTOR FROM USER : 
        const peakFactor = 1;
        const last12Months = getLast12Months();
        //GETTING Monthly Logs for Calculating Daily Average based on Month
        let monthlyST03NLogs = [];
        for (var period of last12Months) {
            console.log("Getting Logs for : ", period);
            const st03nLogs = await callRFC("SWNC_COLLECTOR_GET_AGGREGATES", {
                COMPONENT: 'TOTAL',
                PERIODTYPE: 'M',
                PERIODSTRT: period,
            });
            let logs = st03nLogs.USERTCODE;
            //iterate logs and get the sum of DCOUNT field
            let totalTransactionsForLog = 0;
            for (var log of logs) {
                totalTransactionsForLog = totalTransactionsForLog + parseFloat(log.DCOUNT);
            }

            console.log(`Total Dialog Steps for ${period} : ${totalTransactionsForLog}`);
            console.log(`Period: ${period} - ${logs.length}`);
            if (logs.length > 0) {
                monthlyST03NLogs.push(
                    {
                        "interval": period,
                        "count": totalTransactionsForLog,
                        "logs": logs
                    }
                );
            }

        }

        //finding peak month
        let peakMonthlyTransactions = monthlyST03NLogs.reduce((prev, current) => {
            return (prev.count > current.count) ? prev : current;
        });

        console.log("Monthly Dialogs : ", monthlyST03NLogs.map((log) => log.count));
        console.log("---")
        console.log("Peak Dialog Step Monthy : ", peakMonthlyTransactions.count);
        let peakTransactionsInMonth = peakMonthlyTransactions.count;
        let peakTransactionsDaily = peakTransactionsInMonth / 22; //Assuming 22 working days in a month
        console.log("Daily Average (Based on Month): ", peakTransactionsDaily);

        //Calculating Daily Average
        let currentMonthDates = generateLast30Days();
        console.log("Current Month Dates: ", currentMonthDates);
        let dailyTransactions = [];
        for (var day of currentMonthDates) {
            console.log("Getting Logs for : ", day);
            const st03nLogs = await callRFC("SWNC_COLLECTOR_GET_AGGREGATES", {
                COMPONENT: 'TOTAL',
                PERIODTYPE: 'D',
                PERIODSTRT: day,
            });
            let logs = st03nLogs.USERTCODE;
            //iterate logs and get the sum of DCOUNT field
            let totalTransactionsForLog = 0;
            for (var log of logs) {
                totalTransactionsForLog = totalTransactionsForLog + parseFloat(log.DCOUNT);
            }

            console.log(`Total Transactions for ${day} : ${totalTransactionsForLog}`);
            console.log(`Period: ${day} - ${logs.length}`);
            if (logs.length > 0) {
                dailyTransactions.push({
                    "interval": day,
                    "count": totalTransactionsForLog,
                    "logs": logs
                });
            }

        }

        const peakTransactionsLastWeek = dailyTransactions.reduce((prev, current) => {
            return (prev.count > current.count) ? prev : current;
        });


        console.log("Daily Transactions Count: ", dailyTransactions.map((log) => log.count));
        let peakTransactionsFrom7Days = peakTransactionsLastWeek.count;
        console.log(`MAX Daily Transactions Steps: ${peakTransactionsFrom7Days}`);
        //MAXIMUM OF DAILY DIALOG STEPS 
        let maxTransactionsSteps = Math.max(peakTransactionsDaily, peakTransactionsFrom7Days);
        console.log("Max Daily dialog Steps : ", maxTransactionsSteps);
        let allTransactionDetail = peakMonthlyTransactions.logs;
        if (maxTransactionsSteps === peakTransactionsFrom7Days) {
            allTransactionDetail = peakTransactionsLastWeek.logs;
        } else {
            allTransactionDetail = peakMonthlyTransactions.logs;
        }



        //FINDING TRANSACTIONS / HOUR
        let transactionsPerHour = maxTransactionsSteps / 10;
        console.log("Transactions Per Hour : ", transactionsPerHour);

        console.log(allTransactionDetail.length);

        //APPLY PEAK FACTOR
        let transactionsPerHrPeakFactor = transactionsPerHour * peakFactor;
        console.log("Transactions Per Hour (Peak Factor) : ", transactionsPerHrPeakFactor);

        //Calculate Weighted Average Response Time to compute SAPS Value
        // Calculate weighted average response time:
        let toExcel = allTransactionDetail.map((log) => {
            return {
                "Transaction": log.ENTRY_ID,
                "DCount": log.DCOUNT,
                "Response Time": log.CPUTI,
                "Average Response Time" : parseInt(log.CPUTI) / parseInt(log.DCOUNT)
            }
        });
        fs.writeFileSync('allTransactionDetail.json', JSON.stringify(toExcel,null,2));

        const totalWeightedResponse = allTransactionDetail.reduce((acc, { DCOUNT, CPUTI }) => acc + parseInt(CPUTI), 0);
        console.log("Total Weighted Response Time:", totalWeightedResponse);
        const totalDCount = allTransactionDetail.reduce((acc, { DCOUNT }) => acc + parseInt(DCOUNT), 0);
        console.log("Total DCount:", totalDCount);

        const weightedAvgResponseTime = (totalWeightedResponse / totalDCount);

        console.log("Weighted Average Response Time:", weightedAvgResponseTime);
        let weightedResponseTimeInSeconds = weightedAvgResponseTime/1000;

        console.log("Weighted Average Response Time (Seconds):", weightedResponseTimeInSeconds);

        // Calculate SAPS value:
        const sapsValue = transactionsPerHrPeakFactor / weightedResponseTimeInSeconds;
        console.log("SAPS Value:", sapsValue);
        
        //CALCULATE 



    } catch (error) {
        console.error("Error during SAP calls:", error);
    } finally {
        // closeSAPConnection();
    }
})();

