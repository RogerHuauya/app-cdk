import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Role } from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling'
import * as loadbalancing from 'aws-cdk-lib/aws-elasticloadbalancingv2'


export class AppCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'VPC', { isDefault: true });

    const asg = new autoscaling.AutoScalingGroup(this, 'MyASG', {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 }),
      minCapacity: 2,
      role: Role.fromRoleArn(this, "ASGExecutionRole", this.getLabRoleArn()),
    })

    const alb = new loadbalancing.ApplicationLoadBalancer(this, 'MyALB', {
      vpc: vpc,
      internetFacing: true,
    })

    const listener = alb.addListener('HttpListener', {
      port: 80
    })

    listener.addTargets('Targets', {
      port: 80,
      targets: [asg]
    })

    listener.connections.allowDefaultPortFromAnyIpv4('Allow access to port 80 from the internet.')

    new cdk.CfnOutput(this, 'Hostname', { value: alb.loadBalancerDnsName })
  }

  getLabRoleArn(): string {
    return cdk.Stack.of(this).formatArn({
      service: 'iam',
      region: '',
      account: cdk.Stack.of(this).account,
      resource: 'role/LabRole',
    });
  }

}
