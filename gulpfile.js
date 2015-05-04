gulp = require('gulp');
coffee = require('gulp-coffee');
uglify = require('gulp-uglify');
sourcemaps = require('gulp-sourcemaps');
rename = require('gulp-rename');

gulp.task('watch', ['compile'], function() {
  gulp.watch('slideshow.coffee', ['compile']);
});

gulp.task('compile', function() {
  gulp.src('slideshow.coffee')
    .pipe(sourcemaps.init())
    .pipe(coffee())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('.'))
    .pipe(uglify())
    .pipe(rename('slideshow.min.js'))
    .pipe(gulp.dest('.'));
});

gulp.task('default', ['compile']);