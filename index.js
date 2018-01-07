var range = 100;
var STORAGE_KEY = 'powerGithub';

var configStorage = {
  fetch: function () {
    var config = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return _.isEmpty(config) ? {} : config;
  },
  save: function (config) {
    const conf = _.clone(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conf));
  }
};

new Vue({
  el: '#app',

  data: {
    config: {
      user: '',
      repo: ''
    },

    issues: [],
    qualifiedIssues: [],
    count: 0
  },

  created: function () {
    _.assign(this.config, configStorage.fetch());
    this.reload();
  },

  watch: {
    'config': {
      handler: function (config) {
        configStorage.save(config);
      },
      deep: true
    }
  },
  computed: {
    filterQualified () {
      return _.chain(this.issues)
      .filter(function (issue) {
        return issue.reactions['+1'] || issue.reactions['-1'];
      })
      .sortBy([function (issue) {
        return issue.reactions['+1'] + issue.reactions['-1'];
      }])
      .reverse()
      .value();
    },
    token () {
      return localStorage.getItem('github_token');
    }
  },
  filters: {
    truncate: function (v) {
      if (v) {
        var newline = v.indexOf('\n');
        return newline > 0 ? v.slice(0, newline) : v;
      } else {
        return '';
      }
    }
  },

  methods: {
    buildUrl: function (isIssues) {
      var baseUrl = 'https://api.github.com/repos/';
      if (this.config.user && this.config.repo) {
        baseUrl += this.config.user + '/' + this.config.repo;
        if (isIssues) {
          baseUrl += '/issues?filter=all&state=open&per_page=' + range;
        }
      }
      return baseUrl;
    },
    reload: function () {
      var self = this;
      self.getIssueCount()
      .then(function () {
        var currentPage = 0;
        while (currentPage * range / self.count < 1) {
          currentPage++;
          self.fetchPageData(currentPage);
        }
      });
    },
    getIssueCount: function () {
      var self = this;
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', self.buildUrl());
        if (this.token) xhr.setRequestHeader("Authorization", "Token " + this.token);
        xhr.setRequestHeader('Accept', 'application/vnd.github.squirrel-girl-preview');
        xhr.onload = function () {
          self.count = JSON.parse(xhr.responseText).open_issues_count;
          resolve();
        };
        xhr.onerror = function () {
          reject();
        };
        xhr.send();
      });
    },
    fetchPageData: function (page) {
      var self = this;
      var xhr = new XMLHttpRequest();
      xhr.open('GET', self.buildUrl(true) + '&page=' + page);
      if (this.token) xhr.setRequestHeader("Authorization", "Token " + this.token);
      xhr.setRequestHeader('Accept', 'application/vnd.github.squirrel-girl-preview');
      xhr.onload = function () {
        self.issues = _.concat(self.issues, JSON.parse(xhr.responseText));
      };
      xhr.send();
    }
  }
});
