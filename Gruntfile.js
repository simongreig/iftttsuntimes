
module.exports = function(grunt) {

  grunt.initConfig({

    jshint: {
      files: ['Gruntfile.js', '*.js', 'src/**/*.js', 'test/**/*.js'],
      options: {
        globals: {
          jQuery: true
        },
        node:true,
        esversion: 6,
        validthis:true
      }
    },
    nsp: {
      package: grunt.file.readJSON('package.json')
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-nsp');


  grunt.registerTask('default', ['jshint', 'nsp']);

};
