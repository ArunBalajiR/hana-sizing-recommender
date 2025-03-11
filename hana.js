const hana = require('@sap/hana-client');

const connectionParams = {
    user: "KAAR-3090",
    passwd: "KTern@2019",
    ashost: "172.17.19.18",
    sysnr: "00",
    client: "210",
    lang: "EN",
};

const conn = new hana.Client(connectionParams);

conn.connect((err) => {
  if (err) {
    console.error(err);
    return;
  }
  conn.exec("SELECT sum(disk_size / 1024 / 1024 / 1024) as total_size FROM m_table_persistence_statistics", (err, result) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Total size:', result[0].total_size);
    }
    conn.close();
  });
});