import _ from "lodash";
import Promise from "bluebird";
import Knex from "knex";
import { Client } from "@elastic/elasticsearch";

const ES_INDEX = 'jeffrey-providers';

const esClient = new Client({
  node: 'http://reptilians.io:9200'
});

const knex = Knex({
  client: 'pg',
  // connection: {
  //   user: 'tukula',
  //   database: 'jeffrey',
  //   host: '127.0.0.1',
  //   port: 5432,
  //   max: 10,
  //   idleTimeoutMillis: 30000
  // }
  connection: {
    user: 'root',
    database: 'jeffrey-2',
    host: 'api.jeffrey.app',
    password: 'root',
    port: 5432,
    max: 10,
    idleTimeoutMillis: 30000
  }
});

const main = async () => {
  const euCountryCodes = await Promise.map(
    knex('countries').select('code').where('is_eu', true),
    (country) => country.code
  );

  const { rows: users } = await knex.raw(
    `
      select
        users.id,
        users.first_name,
        users.last_name,
        users.is_available,
        users.is_tester,
        users.last_activity_at,
        postal_addresses.country,
        (
          select
            (round(avg(reviews.rank), 2)::FLOAT) as rank
          from reviews
          where
            reviews.mission_id in (
              select missions.id
              from missions
              where
                missions.id in (
                  select missions.id
                  from missions
                  where missions.provider_id = users.id or missions.client_id = users.id
                )
            )
          and
            not reviews.author_id = users.id
        ),
        (
          select count('id')
          from missions
          where
            missions.provider_id = users.id
            and
            missions.status = 'terminated'
        ) as total_mission
      from users
      left join postal_addresses on users.postal_address_id = postal_addresses.id

      where
        users.first_name is not null and users.last_name != ''
      and
        users.last_name is not null and users.last_name != ''
      and
        postal_addresses.country is not null
      and
        (NOW()::timestamp - "last_activity_at"::timestamp) < '30 days'
      and
        users.is_available = true
    `
  );

  await Promise.each(users, async (user) => {
    const doc = _.pick(user, [
      'first_name',
      'last_name',
      'is_tester',
      'last_activity_at',
      'country',
      'rank',
      'total_mission'
    ]);

    doc.categories = await Promise.map(
      knex('provider_prices')
       .select('service_category_id')
       .where('user_id', user.id)
       .where('is_enabled', true),
      (row) => row.service_category_id
    );

    if (doc.categories.length <= 0) {
      return;
    }

    const locations = await knex('user_locations')
      .where('user_id', user.id)
      .whereRaw('(NOW()::timestamp - "timestamp"::timestamp) < \'10 days\'')
      .orderBy('timestamp', 'desc')
      .limit(1);

    if (locations.length <= 0) {
      return;
    }

    const [ location ] = locations;

    if (!location.country) {
      return;
    }

    if (euCountryCodes.includes(user.country)) {
      if (!euCountryCodes.includes(location.country)) {
        return;
      }
    } else {
      if (location.country !== user.country) {
        return;
      }
    }

    doc.location = {
      lat: location.lat,
      lon: location.lng
    };

    console.dir(doc, { depth: 10 });

    await esClient.index({
      index: ES_INDEX,
      id: user.id,
      body: doc
    });
  });
};

main().then(
  () => process.exit(0),
  (err) => {
    if (err.name === 'ResponseError') {
      console.error(err.meta.body.error);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
);
