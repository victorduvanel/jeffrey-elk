import _ from "lodash";
import Promise from "bluebird";
import Knex from "knex";
import { Client } from "@elastic/elasticsearch";

const ES_INDEX = 'jeffrey-users';

const esClient = new Client({
  node: 'http://reptilians.io:9200'
});

const knex = Knex({
  client: 'pg',
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
  const users = await knex
    .from('users')
    .where('id', 'd8f2a719-fc90-48d3-82d7-c8b89e65b838');

  await Promise.each(users, async (user) => {
    const doc = _.pick(user, [
      'first_name',
      'last_name',
      'date_of_birth',
      'profile_picture',
      'phone_number',
      'bio',
      'is_provider',
      'is_available',
      'is_tester',
      'created_at',
      'updated_at',
      'last_activity_at'
    ]);

    doc.categories = await Promise.map(
      knex('provider_prices')
       .select('service_category_id')
       .where('user_id', user.id)
       .where('is_enabled', true),
      (row) => row.service_category_id
    );

    doc.locations = await Promise.map(
      knex
        .select('*')
        .from('user_locations')
        .where('user_id', user.id),
      (location) => ({
        timestamp: location.timestamp,
        description: location.description,
        description_locale: location.description_locale,
        location: {
          lat: location.lat,
          lon: location.lng
        }
      })
    );

    doc.missions = await Promise.map(
      knex
        .select('missions.*', 'service_categories.slug as category')
        .from('missions')
        .leftJoin('service_categories', 'service_categories.id', 'missions.service_category_id')
        .where('provider_id', user.id),
      async (mission) => {
        const props = _.pick(mission, [
          'price',
          'price_currency',
          'category',
          'start_date',
          'started_date',
          'ended_date',
          'status',
          'created_at',
          'updated_at',
          'type'
        ]);

        if (!_.isNull(mission.lat) && !_.isNull(mission.lng)) {
          props.location = {
            lat: mission.lat,
            lon: mission.lng
          };
        }

        if (!_.isNull(mission.provider_lat) && _.isNull(mission.provider_lng)) {
          props.provider_location = {
            lat: mission.provider_lat,
            lon: mission.provider_lng
          };
        }

        if (mission.canceled_by) {
          props.canceled_by = mission.canceled_by === user.id ? 'provider' : 'client';
        }

        const reviews = await knex
          .from('reviews')
          .where({
            mission_id: mission.id,
            author_id: mission.client_id
          });

        if (reviews.length) {
          props.review = _.pick(reviews[0], [
            'rank',
            'message',
            'created_at',
            'updated_at'
          ]);
        }

        return props;
      }
    );

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
    console.log(err.name);
    if (err.name === 'ResponseError') {
      console.error(err.meta.body.error);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
);
