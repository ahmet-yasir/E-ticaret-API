import sql from 'mssql';
import {config} from './utils/config.js';

export const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Veritabanına bağlandı.');
        return pool;
  })
    .catch(err => {
        console.error('Veritabanı bağlantı hatası:', err);
        process.exit(1);
});