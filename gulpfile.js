//var fs          = require('fs');
//var path        = require('path');
var browserify	= require('browserify');
var babelify 		= require('babelify');
var vueify			= require('vueify');
var extract 		= require('vueify-extract-css');
var source 			= require('vinyl-source-stream');
var buffer			= require('vinyl-buffer');
var gulp        = require('gulp');
var plugins     = require('gulp-load-plugins')();
//var runSequence = require('run-sequence');
var chalk       = require('chalk');
var pkg         = require('./package.json');

// ------------------------------------------------------[ GULP PLUGIN OPTIONS ]
var plumber = {
	options: {
		errorHandler: errorHandler
	}
};

vueify.compiler.applyConfig({
	autoprefixer: {
		browsers: ['last 2 versions', 'ie 9']
	},
	sass: {
		includePaths: ['./client/src/sass/'],
		outputStyle: 'compressed'
	}
});

// ------------------------------------------------------[ HELPER FUNCTIONS ]
function errorHandler(err) {
	console.log('');
	console.log('  ' + chalk.red('[') + 'error' + chalk.red(']') + ' \u2219 ' + chalk.red('in ') + err.plugin);
	console.log('  ' + chalk.red('[') + 'error' + chalk.red(']') + ' \u2219 ' + err.lineNumber + ':' + err.message);
	console.log('  ' + chalk.red('[') + 'error' + chalk.red(']') + ' \u2219 ' + err.fileName);
	console.log('');
	this.emit('end');
}

function log(environment, subject, message) {
	console.log('');
	if (environment === 'dev') {
		console.log('  ' + chalk.cyan('[') + environment + chalk.cyan(']') + ' · ' + chalk.cyan(subject) + ' ' + message);
	} else if (environment === 'dist') {
		console.log('  ' + chalk.magenta('[') + environment + chalk.magenta(']') + ' · ' + chalk.magenta(subject) + ' ' + message);
	} else if (environment === 'test') {
		console.log('  ' + chalk.yellow('[') + environment + chalk.yellow(']') + ' · ' + chalk.yellow(subject) + ' ' + message);
	}
	console.log('');
}

// ------------------------------------------------------[ GULP TASKS ]
gulp.task('dev:watch', function() {
	log('dev', 'peeping', 'your files');
	plugins.livereload.listen();
	gulp.watch('./client/src/sass/**/*.scss', ['dev:build']);
	gulp.watch('./client/src/**/*.vue', ['dev:build']);
	gulp.watch('./client/src/**/*.js', ['dev:build']);
});

gulp.task('dev:build', function() {
	log('dev', 'cooking', 'your files');
	
	return browserify('./client/src/entry.js')
		.transform(vueify)
		.transform(babelify)
		.plugin(extract, { out: './client/public/build.css' })		
		.bundle()		
		.pipe(source('entry.js'))
		.pipe(buffer())
		.pipe(plugins.sourcemaps.init({loadMaps: true, debug: true}))
		.pipe(plugins.uglify())
		.pipe(plugins.rename('build.js'))
		.pipe(plugins.sourcemaps.write('.')).on('error', errorHandler)
		.pipe(gulp.dest('./client/public'))
		.pipe(plugins.livereload());

});

gulp.task('default', ['dev:build','dev:watch']);