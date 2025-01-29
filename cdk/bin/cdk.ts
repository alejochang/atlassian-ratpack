#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AtlassianRatpackStack } from '../lib/atlassian-ratpack-stack';

const app = new cdk.App();
new AtlassianRatpackStack(app, 'AtlassianRatpackStack');
