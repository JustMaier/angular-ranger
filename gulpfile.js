var 
	gulp 			= require('gulp')
,	plumber 		= require('gulp-plumber')
,	concat 			= require('gulp-concat')
,	rename 			= require('gulp-rename')
,	uglify 			= require('gulp-uglify')
,	uglifyCss 		= require('gulp-uglifycss')
,	templateCache   = require('gulp-angular-templatecache')
,	sass            = require('gulp-sass')
,	autoprefixer    = require('gulp-autoprefixer')
,	del          	= require('del')
,	livereload      = require('gulp-livereload')
;

gulp.task('sass', function(){
	var stream = gulp.src('src/angular-ranger.scss')
		.pipe(plumber())
		.pipe(sass())
		.pipe(autoprefixer('last 10 versions'))
		.pipe(gulp.dest('./'))
		.pipe(livereload());

	return stream;
});

gulp.task('templates', function(){
	var stream = gulp.src('src/**/*.html')
		.pipe(plumber())
		.pipe(templateCache({
			root: '',
			module: 'angular-ranger'
		}))
		.pipe(gulp.dest('./'));

	return stream;
});

gulp.task('js', ['templates'], function(){
	var stream = gulp.src(['src/lib/**/*.js','src/**/*.js','templates.js'])
		.pipe(plumber())
		.pipe(concat('angular-ranger.js'))
		.pipe(gulp.dest('./'))
		.pipe(livereload());

	return stream;
})

gulp.task('minify-js', ['js'], function(){
	var stream = gulp.src('angular-ranger.js')
		.pipe(plumber())
		.pipe(uglify())
		.pipe(rename({suffix:'.min'}))
		.pipe(gulp.dest('./'));

	return stream;
})

gulp.task('minify-css', ['sass'], function(){
	var stream = gulp.src('angular-ranger.css')
		.pipe(plumber())
		.pipe(uglifyCss())
		.pipe(rename({suffix:'.min'}))
		.pipe(gulp.dest('./'));

	return stream;
})

gulp.task('minify', ['minify-css', 'minify-js']);

gulp.task('clean', function(cb){
	del([
		'angular-ranger.*',
		'templates.js'
	], cb)
})

gulp.task('build', ['clean', 'minify'], function(cb){
	del(['templates.js'], cb);
});

gulp.task('default', ['build']);

gulp.task('watch', ['build'], function(){
	livereload.listen();

	gulp.watch('src/**/*.scss', ['sass']);
	gulp.watch([
		'src/**/*.html',
		'src/**/*.js',
		], ['js']);
});