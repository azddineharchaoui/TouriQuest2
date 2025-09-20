import React from 'react';
import { Shield, Eye, Lock, Server, Mail, Phone, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  const lastUpdated = "September 1, 2024";
  
  const sections = [
    {
      id: 'information-collection',
      title: 'Information We Collect',
      icon: Eye,
      content: [
        {
          subtitle: 'Personal Information',
          points: [
            'Name, email address, phone number when you book tours',
            'Passport details for tour bookings and permits',
            'Dietary preferences and accessibility requirements',
            'Emergency contact information'
          ]
        },
        {
          subtitle: 'Usage Information',
          points: [
            'Website browsing patterns and preferences',
            'Device information and IP address',
            'Booking history and tour preferences',
            'Communication preferences'
          ]
        }
      ]
    },
    {
      id: 'information-use',
      title: 'How We Use Your Information',
      icon: Server,
      content: [
        {
          subtitle: 'Service Provision',
          points: [
            'Processing and confirming your tour bookings',
            'Providing customer support and assistance',
            'Sending important travel updates and notifications',
            'Facilitating communication with local guides and partners'
          ]
        },
        {
          subtitle: 'Improvement & Marketing',
          points: [
            'Improving our website and service quality',
            'Sending promotional emails (with your consent)',
            'Analyzing booking trends to enhance our offerings',
            'Personalizing your experience on our platform'
          ]
        }
      ]
    },
    {
      id: 'information-sharing',
      title: 'Information Sharing',
      icon: Lock,
      content: [
        {
          subtitle: 'Tour Partners',
          points: [
            'Local guides and accommodation providers (as necessary for your tour)',
            'Transportation providers for seamless travel arrangements',
            'Activity providers for specialized experiences',
            'Emergency services if required for your safety'
          ]
        },
        {
          subtitle: 'Legal Requirements',
          points: [
            'When required by Moroccan or applicable law',
            'To protect our rights and prevent fraud',
            'In response to valid legal requests',
            'For public safety and security purposes'
          ]
        }
      ]
    },
    {
      id: 'data-security',
      title: 'Data Security',
      icon: Shield,
      content: [
        {
          subtitle: 'Protection Measures',
          points: [
            'SSL encryption for all data transmission',
            'Secure servers with regular security updates',
            'Limited access to personal information by authorized staff only',
            'Regular security audits and compliance checks'
          ]
        },
        {
          subtitle: 'Data Retention',
          points: [
            'Booking information kept for 3 years for service provision',
            'Marketing preferences stored until you opt out',
            'Legal documents retained as required by Moroccan law',
            'Website analytics data aggregated and anonymized'
          ]
        }
      ]
    }
  ];

  const rights = [
    {
      title: 'Access Your Data',
      description: 'Request a copy of all personal information we hold about you'
    },
    {
      title: 'Correct Information',
      description: 'Update or correct any inaccurate personal information'
    },
    {
      title: 'Delete Data',
      description: 'Request deletion of your personal information (subject to legal requirements)'
    },
    {
      title: 'Data Portability',
      description: 'Receive your data in a structured, machine-readable format'
    },
    {
      title: 'Opt-Out',
      description: 'Unsubscribe from marketing communications at any time'
    },
    {
      title: 'Restrict Processing',
      description: 'Limit how we use your information in certain circumstances'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Privacy Policy</h1>
            <p className="text-xl text-white/90 leading-relaxed max-w-3xl mx-auto">
              Your privacy is important to us. This policy explains how TouriQuest collects, 
              uses, and protects your personal information.
            </p>
            <p className="text-white/70 mt-4">Last updated: {lastUpdated}</p>
            {onBack && (
              <Button 
                onClick={onBack}
                variant="outline" 
                className="mt-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                ← Back to Home
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        {/* Introduction */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to TouriQuest</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                TouriQuest ("we," "our," or "us") is committed to protecting your privacy and ensuring 
                the security of your personal information. As a Morocco-based tourism company, we operate 
                under Moroccan data protection laws and international best practices.
              </p>
              <p className="text-gray-600 leading-relaxed">
                This Privacy Policy applies to all services provided by TouriQuest, including our website, 
                booking platform, and tour services. By using our services, you agree to the collection 
                and use of information in accordance with this policy.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Sections */}
        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <Card key={section.id} id={section.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3 text-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <span>{section.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {section.content.map((subsection, subIndex) => (
                    <div key={subIndex} className={subIndex > 0 ? 'mt-6' : ''}>
                      <h4 className="font-semibold text-gray-800 mb-3">{subsection.subtitle}</h4>
                      <ul className="space-y-2">
                        {subsection.points.map((point, pointIndex) => (
                          <li key={pointIndex} className="flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                            <span className="text-gray-600 leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Your Rights */}
        <div className="max-w-4xl mx-auto mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Your Rights</CardTitle>
              <CardDescription>
                You have several rights regarding your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rights.map((right, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">{right.title}</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">{right.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cookies Policy Summary */}
        <div className="max-w-4xl mx-auto mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Cookies and Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600 leading-relaxed">
                  We use cookies and similar technologies to enhance your browsing experience, 
                  analyze website traffic, and personalize content. These include:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600"><strong>Essential cookies:</strong> Required for website functionality</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600"><strong>Analytics cookies:</strong> Help us understand website usage</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600"><strong>Marketing cookies:</strong> Used to show relevant advertisements</span>
                  </li>
                </ul>
                <p className="text-gray-600 leading-relaxed">
                  You can control cookie preferences through your browser settings or our cookie consent banner.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* International Transfers */}
        <div className="max-w-4xl mx-auto mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed mb-4">
                As a Morocco-based company serving international customers, we may transfer your 
                personal information outside of Morocco for the following purposes:
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-600">Payment processing through international payment providers</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-600">Cloud storage and backup services</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-600">Email communication and customer support tools</span>
                </li>
              </ul>
              <p className="text-gray-600 leading-relaxed">
                All international transfers are protected by appropriate safeguards including 
                contractual protections and adequacy decisions.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Contact Information */}
        <div className="max-w-4xl mx-auto mt-12">
          <Card className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-6 text-center">Questions About Your Privacy?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold mb-2">Email Us</h4>
                  <p className="text-white/90 text-sm">privacy@touriquest.com</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold mb-2">Call Us</h4>
                  <p className="text-white/90 text-sm">+212 522 123 456</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold mb-2">Response Time</h4>
                  <p className="text-white/90 text-sm">Within 48 hours</p>
                </div>
              </div>
              <Separator className="my-6 bg-white/20" />
              <p className="text-center text-white/90 leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, 
                please don't hesitate to contact our Data Protection Officer. We're committed 
                to addressing your concerns promptly and transparently.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Updates */}
        <div className="max-w-4xl mx-auto mt-12">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Policy Updates</h3>
              <p className="text-gray-600 leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our practices 
                or legal requirements. When we make significant changes, we will notify you by email 
                or through a prominent notice on our website. The updated policy will be effective 
                immediately upon posting.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}