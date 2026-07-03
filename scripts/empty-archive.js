hexo.extend.generator.register('empty_archive', function(locals) {
  if (locals.posts.length) {
    return [];
  }

  return {
    path: hexo.config.archive_dir + '/index.html',
    layout: ['archive'],
    data: {
      title: 'Archives',
      posts: locals.posts,
      page: 1
    }
  };
});