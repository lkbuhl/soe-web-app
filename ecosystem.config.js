module.exports = { apps: [{ name: "soe-web-app", script: "server.js", env: { 
      NODE_ENV: "production", DARTMOUTH_API_KEY: "process.env.DARTMOUTH_API_KEY"
    }
  }]
}
