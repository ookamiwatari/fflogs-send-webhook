const reqp = require("request-promise-native");

module.exports = {
  send: async (url, string) => {
    const options = {
      url: url,
      method: "POST",
      json: {
        username: "FF LOGS",
        avatar_url: "https://assets.rpglogs.com/img/ff/favicon.png",
        content: string,
      },
    };
    return await reqp(options);
  },
};
