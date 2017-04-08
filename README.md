# NodeBB qiniu Uploads Plugin

[![Dependency Status](https://david-dm.org/LouiseMcMahon/nodebb-plugin-qiniu-uploads.svg)](https://david-dm.org/LewisMcMahon/nodebb-plugin-qiniu-uploads)

This plugin is a fork of [nodebb-plugin-qiniu-uploads](https://github.com/earthsenze/nodebb-plugin-qiniu-uploads) as it was no longer being maintained

`npm install nodebb-plugin-qiniu-uploads-updated`

| Plugin Version | Dependency     | Version Requirement     |
| ---------------| -------------- |:-----------------------:|
| 0.2.x          | NodeBB         | <= 0.5.3 and >= 0.3.2 |
| 0.3.3          | NodeBB         | >= 0.6.0 |
| 0.3.4          | NodeBB         | >= 1.0.0 |

A plugin for NodeBB to take file uploads and store them on qiniu, uses the `filter:uploadImage` hook in NodeBB. 


## qiniu Uploads Configuration


You can configure this plugin via a combination of the below, for instance, you can use **instance meta-data** and **environment variables** in combination. You can also configure via the NodeBB Admin panel, which will result in the Bucket and Credentials being stored in the NodeBB Database.

If you decide to use the Database storage for Credentials, then they will take precedence over both Environment Variables and Instance Meta-data, the full load order is:

1. Database
2. Environment Variables
3. Instance Meta-data

For instance, for [talk.kano.me](http://talk.kano.me), we store the Bucket name in an Environment Variable, and the Credentials are discovered automatically with the Security Token Service.

### Environment Variables

```
export QINIU_ACCESS_KEY_ID="xxxxx"
export QINIU_SECRET_ACCESS_KEY="yyyyy"
export QINIU_UPLOADS_BUCKET="zzzz"
export QINIU_UPLOADS_HOST="host"
export QINIU_UPLOADS_PATH="path"
```

**NOTE:** Asset host is optional - If you do not specify an asset host, then the default asset host is `<bucket>.qiniu.amazonaws.com`.
**NOTE:** Asset path is optional - If you do not specify an asset path, then the default asset path is `/`.

### Database Backed Variables

From the NodeBB Admin panel, you can configure the following settings to be stored in the Database:

* `bucket` — The qiniu bucket to upload into
* `host` - The base URL for the asset.  **Typcially http://\<bucket\>.qiniu.amazonaws.com**
* `path` - The asset path (optional)
* `accessKeyId` — The AWS Access Key Id
* `secretAccessKey` — The AWS Secret Access Key

**NOTE: Storing your AWS Credentials in the database is bad practice, and you really shouldn't do it.**

We highly recommend using either **Environment Variables** or **Instance Meta-data** instead.

## Caveats

* Currently all uploads are stored in qiniu keyed by a UUID and file extension, as such, if a user uploads multiple avatars, all versions will still exist in qiniu. This is a known issue and may require some sort of cron job to scan for old uploads that are no longer referenced in order for those objects to be deleted from qiniu.

## Contributing
[Before contributing please check the contribution guidelines](https://github.com/LouiseMcMahon/nodebb-plugin-qiniu-uploads/blob/master/.github/CONTRIBUTING.md)


## Credit

This plugin is a folk from [LouiseMcMahon's nodebb-plugin-qiniu-uploads](https://github.com/LouiseMcMahon/nodebb-plugin-qiniu-uploads). Thanks for her great job.