gulp = require('gulp');
coffee = require('gulp-coffee');
uglify = require('gulp-uglify');
rename = require('gulp-rename');

gulp.task('compile', function() {
  gulp.src('slideshow.coffee')
    .pipe(coffee())
    .pipe(gulp.dest('.'))
    .pipe(uglify())
    .pipe(rename('slideshow.min.js'))
    .pipe(gulp.dest('.'));
});

gulp.task('default', ['compile']);