const databaseName = "databaseName";
const databaseType = "mongodb";

export const DatabaseSettings = {
  useMongo: true,
  seedMongo: false,
  databaseName: databaseName,
  db: {
    seed: 'localhost/' + databaseName,
    uri: databaseType + '://localhost/' + databaseName,
    options: {
      db: {
        safe: true
      },
      config: {
        autoIndex: false
      }
    }
  }
};
