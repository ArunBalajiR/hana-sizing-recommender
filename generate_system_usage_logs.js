var rfc = require("node-rfc");
var json2xls = require("json2xls");
var fs = require("fs");
var waterfall = require("async-waterfall");
var xlsx = require("xlsx");
var _ = require("underscore");

try {
    workbook1 = xlsx.readFile("../DataInput.xlsx");
    sheet_name_list1 = workbook1.SheetNames;
    xldata1 = xlsx.utils.sheet_to_json(workbook1.Sheets[sheet_name_list1[0]]);
} catch (err) {
    console.log("Data Input Not Found");
}

let systemvalue = xldata1
    .filter((obj) => obj.Parameter === "systemvalue")
    .map((obj) => obj.Value)
    .toString();

let sysnr = xldata1
    .filter((obj) => obj.Parameter === "sysnr")
    .map((obj) => obj.Value)
    .toString();

let ashost = xldata1
    .filter((obj) => obj.Parameter === "ashost")
    .map((obj) => obj.Value)
    .toString();

let client = xldata1
    .filter((obj) => obj.Parameter === "client")
    .map((obj) => obj.Value)[0];

let user = xldata1
    .filter((obj) => obj.Parameter === "user")
    .map((obj) => obj.Value)
    .toString();

let passwd = xldata1
    .filter((obj) => obj.Parameter === "passwd")
    .map((obj) => obj.Value)
    .toString();

let saprouterboolean = xldata1
    .filter((obj) => obj.Parameter === "saprouterboolean")
    .map((obj) => obj.Value)[0];
let saprouter = xldata1
    .filter((obj) => obj.Parameter === "saprouter")
    .map((obj) => obj.Value)
    .toString();

let lang = xldata1
    .filter((obj) => obj.Parameter === "lang")
    .map((obj) => obj.Value)
    .toString();

let component_value = xldata1
    .filter((obj) => obj.Parameter === "component_value")
    .map((obj) => obj.Value);

let type_value = xldata1
    .filter((obj) => obj.Parameter === "type_value")
    .map((obj) => obj.Value);

let logs = xldata1
    .filter((obj) => obj.Parameter === "logs")
    .map((obj) => obj.Value);

logs = getLastSixMonths();

component_value = component_value[0];
type_value = type_value[0];
let start_value = logs;

let system_value = systemvalue;

st03nstats = [];
systemlog = [];

client1 = new rfc.Client(connParams1);

client1.connect(function(err1) {
    if (err1) {
        console.log("err1", err1);
    } else {
        console.log("Connecting ...");

        waterfall(
            [
                function(callback) {
                    console.log("Processing logs in...");

                    i = 0;
                    looprfc();

                    function looprfc() {
                        client1.invoke(
                            "SWNC_COLLECTOR_GET_AGGREGATES", {
                                COMPONENT: component_value,
                                ASSIGNDSYS: system_value,
                                PERIODTYPE: type_value,
                                PERIODSTRT: start_value[i],
                            },
                            function(err2, res2) {
                                if (res2) {
                                    console.log("Processing logs out ...");

                                    json12 = res2.USERTCODE;
                                    if (json12.length > 0) {
                                        st03nstats.push(json12);

                                        console.log(start_value[i], json12.length);
                                        i++;
                                        if (i == start_value.length) {
                                            callback(null, "happy");
                                        } else {
                                            looprfc();
                                        }
                                    } else {
                                        console.log(start_value[i], "no data found1");
                                        i++;
                                        if (i == start_value.length) {
                                            callback(null, "happy");
                                        } else {
                                            looprfc();
                                        }
                                    }
                                } else {
                                    console.log(start_value[i], "no data found2");

                                    i++;
                                    if (i == start_value.length) {
                                        callback(null, "happy");
                                    } else {
                                        looprfc();
                                    }
                                }
                            }
                        );
                    }
                },

                function(msg, callback) {
                    client1.invoke("/SDF/CMO_GET_CUST_OBJ", {}, function(err2, res2) {
                        if (res2) {
                            console.log("Processing ...");

                            outputjson2 = res2.TT_CUST_CLASSES;

                            // resultjson2 = json2xls(outputjson2);
                            // fs.writeFileSync(
                            //   "./raw_output/unstructured_files/KTern - Custom Object Analysis - Package Names.xlsx",
                            //   resultjson2,
                            //   "binary"
                            // );
                            callback(null, "happy");
                        } else {
                            console.log("err2", err2);
                        }
                    });
                },

                function(msg, callback) {
                    console.log("Processing ...");
                    fs.writeFileSync("ST03nlogs.json", JSON.stringify(st03nstats))

                    for (i = 0; i < st03nstats.length; i++) {
                        for (j = 0; j < st03nstats[i].length; j++) {
                            if (
                                st03nstats[i][j].ENTRY_ID != undefined &&
                                st03nstats[i][j].COUNT != undefined &&
                                st03nstats[i][j].ACCOUNT != undefined &&
                                st03nstats[i][j].TASKTYPE != undefined
                            ) {

                                arrid = st03nstats[i][j].ENTRY_ID.trim().split(/\s+/);
                                let temp = st03nstats[i][j].ENTRY_ID.trim()
                                arrid1 = temp ?.slice(0, -1).trim();
                                arrid2 = temp ?.slice(-1)[0].trim();

                                if (arrid2 != 'T' && arrid2 != 'R' && arrid2 != 'W') {
                                    arrid1 = temp.trim();
                                    arrid2 = ""
                                }
                                arrcount = st03nstats[i][j].COUNT.trim();
                                arrcount = parseInt(arrcount);

                                arruser = st03nstats[i][j].ACCOUNT.trim();

                                buf = st03nstats[i][j].TASKTYPE;
                                arrtasktype = buf.toString("hex");
                                //console.log(buf, "##", arrtasktype);

                                systemlog.push({
                                    TASKTYPE: arrtasktype,
                                    NAME: arrid1,
                                    CATEGORY: arrid2,
                                    COUNT: arrcount,
                                    USER: arruser,
                                });
                            } else {
                                console.log(st03nstats[i][j]);
                            }
                        }
                    }

                    console.log(systemlog.length);


                



                    resultjson13 = json2xls(systemlog);
                    fs.writeFileSync(
                        "./raw_output/unstructured_files/KTern - Landscape Analysis - System Usage Log.xlsx",
                        resultjson13,
                        "binary"
                    );

                    callback(null, "happy");
                },

                function(msg, callback) {
                    console.log("Processing ...");

                    groups = _(systemlog).groupBy("NAME");
                    systemlogunique = _(groups).map(function(g, key) {
                        g = _.sortBy(g, "COUNT").reverse();
                        // console.log(g);
                        userarr = "";
                        for (k = 0; k < g.length; k++) {
                            rankno = k + 1;
                            rankuser = g[k].USER;
                            userarr = userarr + "Rank " + rankno + ": " + rankuser + "; ";
                        }

                        return {
                            OBJECT_NAME: key,
                            COUNT: _(g).reduce(function(m, x) {
                                return m + x.COUNT;
                            }, 0),
                            OBJECT_USER: userarr,
                        };
                    });

                    systemlogunique = _.sortBy(systemlogunique, "COUNT").reverse();
                    console.log(systemlogunique);

                    resultjson23 = json2xls(systemlogunique);
                    fs.writeFileSync(
                        "./raw_output/unstructured_files/KTern - Landscape Analysis - System Usage Log Unique.xlsx",
                        resultjson23,
                        "binary"
                    );

                    callback(null, "happy");
                },
            ],
            function main(err, msg) {
                console.log("REPORT GENERATED SUCCESSFULLY");
            }
        );
    }
});

function getLastSixMonths() {
    const dates = [];
    const today = new Date();

    // Set today's date to the first day of the current month
    today.setDate(1);

    // Loop to get the first day of each month for the last 6 months (including current month)
    // We start from 5 months ago and go to the current month.
    for (let i = 5; i >= 0; i--) {
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