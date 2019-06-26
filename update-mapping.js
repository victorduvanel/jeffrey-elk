import request from 'request-promise';
import mapping from './mapping';

const main = () => {
  return request({
    method: 'PUT',
    url: 'http://reptilians.io:9200/jeffrey-providers/_mapping',
    json: true,
    body: mapping
  });
};

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
