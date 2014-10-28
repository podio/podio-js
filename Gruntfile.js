/*global module:false*/

module.exports = function(grunt) {

  grunt.initConfig({

    karma: {
      phantom: {
        configFile: './karma.conf.js',
        autoWatch     : true,
        browsers      : ['PhantomJS']
      }

    }

  });

  grunt.loadNpmTasks('grunt-karma');

  // Default task.
  grunt.registerTask('default', ['karma:phantom']);

};
