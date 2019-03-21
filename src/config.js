const config = {
    baseUrl: 'https://www.yuque.com/api/v2',
    headers: {
        'User-Agent': 'no-doc',
            'X-Auth-Token': 'WdhcLYONf8AvaNFnQPkw0yGdZxXsbXKOTpQZdsO9',
    },
    title: 'UIRecorder',
    repos: [
        {
            name: 'UIRecorder',
            namespace: 'https://www.yuque.com/linshuoting/uirecorder',
        },
    ],
    githubUrl: 'https://github.com/alibaba/uirecorder',
};

config.repos.forEach((repo) => {
    // format namespace
    repo.namespace = repo.namespace.replace(/\https:\/\/www.yuque.com\//, '');
})

module.exports = config;