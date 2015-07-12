module.exports = function (grunt) {
	// Load NPM modules as needed
	require('jit-grunt')(grunt);
  
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		src_dir: 'webapp',
		dest_dir: 'webapp/dist',
		less:{
			root:{
				files: {
					'<%=dest_dir%>/styles/weblab-temp.css': '<%=src_dir%>/styles/*.less'
				}
			},
			blur:{
				files:{
					'webapp/blur/dist/blur.css': 'webapp/blur/blur.less'
				}
			},
			easlejs:{
				files:{
					'webapp/easlejs-lab/dist/easlejs-lab.css': 'webapp/easlejs-lab/easlejs-lab.less'
				}
			}
		},
		
		autoprefixer:{
			options: {
			  browsers: ['last 3 versions', 'ie 8', 'ie 9']
			},
			root:{
				src:['<%=dest_dir%>/styles/*.css','!<%=dest_dir%>/styles/weblab.css'],
				dest:'<%=dest_dir%>/styles/weblab.css'
			},
			blur:{
				src:['webapp/blur/dist/blur.css'],
				dest:'webapp/blur/dist/all.css'
			},
			easlejs:{
				src:['webapp/easlejs-lab/dist/easlejs-lab.css'],
				dest:'webapp/easlejs-lab/dist/all.css'
			}
		},
		
		watch:{
			js:{
				files:[ '<%=src_dir%>/js/**/*.js', '!<%=src_dir%>/js/i18n/*.js'],
				tasks: ['concat','uglify']
			},
			less:{
				files:['<%=src_dir%>/styles/**/*.less'],
				tasks: ['less', 'autoprefixer']
			},
			easlejs:{
				files:['webapp/easlejs-lab/*.{js,less}'],
				tasks: ['less:easlejs', 'autoprefixer:easlejs', 'concat:easlejs']
			}
		},
		
		concat:{
			js: {
				files:{
					'<%=dest_dir%>/js/weblab.js': ['<%=src_dir%>/js/modules.js', '<%=src_dir%>/js/**/*.js', '!<%=src_dir%>/js/i18n/*.js']
				}
			},
			easlejs: {
				files:{
					'webapp/easlejs-lab/dist/all.js': 
						['webapp/easlejs-lab/easlejs-lab.js', 'webapp/easlejs-lab/*.js']
				}
			}
		},
		
		uglify:{
			options:{
				sourceMap: true
			},
			js:{
				files:{
					'<%=dest_dir%>/js/weblab.min.js':'<%=dest_dir%>/js/weblab.js'
				}
			}
		},
		
		hashres: {
			options: {
				fileNameFormat: '${name}.${ext}?${hash}',
				renameFiles: false
			},
			prod: {
				src: ['<%= dest_dir %>/js/*.js', '<%= dest_dir %>/styles/*.css'],
				dest: '<%=src_dir%>/views/index.html'
			}
		}
	});
	grunt.registerTask('default', ['concat', 'less', 'autoprefixer', 'uglify']);
	grunt.registerTask('production', ['concat', 'less', 'autoprefixer', 'uglify', 'hashres']);
	
	grunt.registerTask('blur', ['less:blur', 'autoprefixer:blur']);
	grunt.registerTask('easlejs', ['less:easlejs', 'autoprefixer:easlejs', 'concat:easlejs']);
}
