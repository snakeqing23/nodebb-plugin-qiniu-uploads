<h1><i class="fa fa-picture-o"></i> QINIU Uploads Configuration</h1>
<hr/>

<p>You can configure this plugin via a combination of the below, for instance, you can use <em>instance meta-data</em>
	and <em>environment variables</em> in combination. You can also specify values in the form below, and those will be
	stored in the database.</p>

<h3>Environment Variables</h3>
<pre><code>export QINIU_ACCESS_KEY_ID="xxxxx"
export QINIU_SECRET_ACCESS_KEY="yyyyy"
export QINIU_UPLOADS_BUCKET="zzzz"
export QINIU_UPLOADS_HOST="host"
export QINIU_UPLOADS_PATH="path"
</code></pre>

<p>
	Asset host and asset path are optional. You can leave these blank to default to the standard asset url -
	http://mybucket.QINIU.amazonaws.com/uuid.jpg.<br/>
	Asset host can be set to a custom asset host. For example, if set to cdn.mywebsite.com then the asset url is
	http://cdn.mywebsite.com/uuid.jpg.<br/>
	Asset path can be set to a custom asset path. For example, if set to /assets, then the asset url is
	http://mybucket.QINIU.amazonaws.com/assets/uuid.jpg.<br/>
	If both are asset host and path are set, then the url will be http://cdn.mywebsite.com/assets/uuid.jpg.
</p>

<div class="alert alert-warning">
	<p>If you need help, create an <a href="https://github.com/LewisMcMahon/nodebb-plugin-qiniu-uploads/issues/">issue on
		Github</a>.</p>
</div>

<h3>Database Stored configuration:</h3>
<form id="qiniu-upload-bucket">
	<label for="qiniubucket">Bucket</label><br/>
	<input type="text" id="qiniubucket" name="bucket" value="{bucket}" title="qiniu Bucket" class="form-control input-lg"
	       placeholder="qiniu Bucket"><br/>

	<label for="qiniuhost">Host</label><br/>
	<input type="text" id="qiniuhost" name="host" value="{host}" title="qiniu Host" class="form-control input-lg"
	       placeholder="website.com"><br/>

	<label for="qiniupath">Path</label><br/>
	<input type="text" id="qiniupath" name="path" value="{path}" title="qiniu Path" class="form-control input-lg"
	       placeholder="/assets"><br/>

	<button class="btn btn-primary" type="submit">Save</button>
</form>

<br><br>
<form id="qiniu-upload-credentials">
	<label for="bucket">Credentials</label><br/>
	<div class="alert alert-warning">
		Configuring this plugin using the fields below is <strong>NOT recommended</strong>, as it can be a potential
		security issue. We highly recommend that you investigate using either <strong>Environment Variables</strong> or
		<strong>Instance Meta-data</strong>
	</div>
	<input type="text" name="accessKeyId" value="{accessKeyId}" maxlength="20" title="Access Key ID"
	       class="form-control input-lg" placeholder="Access Key ID"><br/>
	<input type="text" name="secretAccessKey" value="{secretAccessKey}" title="Secret Access Key"
	       class="form-control input-lg" placeholder="Secret Access Key"><br/>
	<button class="btn btn-primary" type="submit">Save</button>
</form>

<script>
	$(document).ready(function () {
		$("#qiniu-upload-bucket").on("submit", function (e) {
			e.preventDefault();
			save("qiniuSettings", this);
		});

		$("#qiniu-upload-credentials").on("submit", function (e) {
			e.preventDefault();
			var form = this;
			bootbox.confirm("Are you sure you wish to store your credentials for accessing qiniu in the database?", function (confirm) {
				if (confirm) {
					save("credentials", form);
				}
			});
		});

		function save(type, form) {
			var data = {
				_csrf: '{csrf}' || $('#csrf_token').val()
			};

			var values = $(form).serializeArray();
			for (var i = 0, l = values.length; i < l; i++) {
				data[values[i].name] = values[i].value;
			}

			$.post('{forumPath}api/admin/plugins/qiniu-uploads/' + type, data).done(function (response) {
				if (response) {
					ajaxify.refresh();
					app.alertSuccess(response);
				}
			}).fail(function (jqXHR, textStatus, errorThrown) {
				ajaxify.refresh();
				app.alertError(jqXHR.responseJSON ? jqXHR.responseJSON.error : 'Error saving!');
			});
		}
	});
</script>
