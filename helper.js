const json2xls = require("json2xls");
const fs = require('fs');
module.exports.systemProfiler = (et_harware_xml) => {
  "---------------------System Profiler Started-------------------------";

  // System Profiler
  let parsed_xml_data = [];
  let ccms_get_system_info;
  let xml_array = [];
  let ccms_formulateddata_array;
  let formulated_xml_array;
  let db;
  let databasesize = [];
  let clients;

  try {
    const xmlContent = et_harware_xml.map((row) => row.DESCR).join("");
    const regex = /<property name="([^"]+)">[\s\S]*?<value>([^<]+)<\/value>/g;
    let match;

    while ((match = regex.exec(xmlContent)) !== null) {
      const propertyName = match[1];
      const value = match[2];
      parsed_xml_data.push({ propertyname: propertyName, value });
    }
  } catch (err) {
    console.log(err);
  }

  let ccms_fields = [
    "SYSID",
    "operating system",
    "DB",
    "SYS RELEASE",
    "UNICODE",
    "HOSTNAME",
    "SAP version",
    "machine type",
    "node name",
    "SAP system id",
    "database name",
    "IP address",
    "supported database",
    "PHYS_MEM",
    "FREE_MEM",
    "INSTANCE",
    "database owner",
    "database host",
    "supported SAP vers.",
    "ABAP load version",
    "CUA load version",
    "valid OP system",
    "OP system release",
  ];

  let xml_fields = [
    "CPUType",
    "Manufacturer",
    "MachineCategory",
    "OpSysReleaseName",
    "NumberOfCPUs",
  ];

  if (parsed_xml_data.length > 0) {
    for (let field of xml_fields) {
      let data = parsed_xml_data.filter((obj) => {
        return obj["propertyname"] === field;
      });
      xml_array.push(...data);
    }
  }

  xml_array = removeDuplicates(xml_array);

  let ccms_array = [];



  let uniqueArray = [];
  const keySet = new Set();

  ccms_array.forEach((item) => {
    const key = item.TCODE + item.COMM;
    if (!keySet.has(key)) {
      keySet.add(key);
      uniqueArray.push(item);
    }
  });

  ccms_array = uniqueArray;

  ccms_array.filter((obj) => {
    if (obj.TCODE === "SYS RELEASE") {
      return (obj.TCODE = "SAP Netweaver Version");
    }
  });

  ccms_array.filter((obj) => {
    if (obj.TCODE === "SYSID") {
      return (obj.TCODE = "System ID");
    }
  });

  ccms_array.filter((obj) => {
    if (obj.TCODE === "operating system") {
      return (obj.TCODE = "Operating System");
    }
  });

  ccms_array.filter((obj) => {
    if (obj.TCODE === "DB") {
      return (obj.TCODE = "Database");
    }
  });

  ccms_array.filter((obj) => {
    if (obj.TCODE === "UNICODE") {
      return (obj.TCODE = "Type");
    }
  });

  // xml_array
  // ccms_array

  if (ccms_array.length > 0) {
    ccms_formulateddata_array = ccms_array.map((obj) => ({
      tab: "Details",
      Parameter: obj["TCODE"],
      Value: obj["COMM"],
      Name: "",
      City: "",
      Currency: "",
      "Last changed by": "",
      "Last changed on": "",
    }));

    var parameterOrder = [
      "System ID",
      "Operating System",
      "Database",
      "SAP Netweaver Version",
    ];

    ccms_formulateddata_array = ccms_formulateddata_array.sort(function (a, b) {
      var aIndex = parameterOrder.indexOf(a.Parameter);
      var bIndex = parameterOrder.indexOf(b.Parameter);

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      } else if (aIndex !== -1) {
        return -1;
      } else if (bIndex !== -1) {
        return 1;
      } else {
        return 0;
      }
    });
  }

  if (xml_array.length > 0) {
    formulated_xml_array = xml_array.map((obj) => ({
      tab: "Details",
      Parameter: obj.propertyname,
      Value: obj.value,
      Name: "",
      City: "",
      Currency: "",
      "Last changed by": "",
      "Last changed on": "",
    }));
  }


  let finalDetailsArray = [
    // ...ccms_formulateddata_array,
    ...formulated_xml_array,
  ];

  let orderArray = [
    "System ID",
    "Operating System",
    "Database",
    "SAP Netweaver Version",
    "IP address",
    "Type",
    "Manufacturer",
    "OpSysReleaseName",
    "CPUType",
    "MachineCategory",
    "NumberOfCPUs",
    "HOSTNAME",
    "INSTANCE",
    "SAP version",
    "machine type",
    "node name",
    "SAP system id",
    "database name",
    "supported database",
    "PHYS_MEM",
    "FREE_MEM",
    "database owner",
    "database host",
    "supported SAP vers.",
    "ABAP load version",
    "CUA load version",
    "valid OP system",
    "OP system release",
  ];

  finalDetailsArray.sort((a, b) => {
    const indexA = orderArray.indexOf(a.Parameter);
    const indexB = orderArray.indexOf(b.Parameter);
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) {
      return -1;
    }
    if (indexB !== -1) {
      return 1;
    }
    return 0;
  });


  finalDetailsArray = [...finalDetailsArray];
  finalDetailsArray = finalDetailsArray.map((obj, index) => ({
    "S No": `${index + 1}`,
    ...obj,
  }));


  resultjson1 = json2xls(finalDetailsArray);

  fs.writeFileSync(
    "./xlsx/KTern - Automated Landscape Assessment - System Profiler.xlsx",
    resultjson1,
    "binary"
  );
  console.log(
    "---------------------System Profiler Ended-------------------------"
  );
};


const removeDuplicates = (arr) => {
  const uniqueItems = [];
  const keys = new Set();

  for (const item of arr) {
    const key = JSON.stringify(item);
    if (!keys.has(key)) {
      keys.add(key);
      uniqueItems.push(item);
    }
  }

  return uniqueItems;
};
