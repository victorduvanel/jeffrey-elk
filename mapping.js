const mapping = {
  properties: {
    first_name: {
      type: "text"
    },
    last_name: {
      type: "text"
    },
    is_tester: {
      type: "boolean"
    },
    last_online_at: {
      type: "date"
    },
    last_activity_at: {
      type: "date"
    },
    categories: {
      type: "keyword"
    },
    location: {
      type: "geo_point"
    },
    country: {
      type: "keyword"
    },
    rank: {
      type: "half_float"
    },
    total_mission: {
      type: "half_float"
    }
  }
};

export default mapping;
