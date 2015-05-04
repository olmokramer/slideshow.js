path = require('path');
gulp = require('gulp');
coffee = require('gulp-coffee');
uglify = require('gulp-uglify');
sourcemaps = require('gulp-sourcemaps');
ignore = require('gulp-ignore');
rename = require('gulp-rename');

gulp.task('watch', ['compile'], function() {
  gulp.watch('slideshow.coffee', ['compile']);
});

gulp.task('compile', function() {
  gulp.src('slideshow.coffee')
    .pipe(sourcemaps.init())
    .pipe(coffee())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('.'))
    .pipe(ignore(function(file) {
      return path.extname(file.path) !== '.js';
    }))
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify())
    .pipe(rename('slideshow.min.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('.'));
});

gulp.task('default', ['compile']);
