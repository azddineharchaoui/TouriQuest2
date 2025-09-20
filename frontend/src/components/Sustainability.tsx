import React from 'react';
import { 
  Leaf, 
  Recycle, 
  Users, 
  Droplets,
  TreePine,
  Sun,
  Heart,
  Shield,
  Compass,
  Camera,
  Mountain,
  Building
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface SustainabilityProps {
  onBack?: () => void;
}

export function Sustainability({ onBack }: SustainabilityProps) {
  const initiatives = [
    {
      icon: Users,
      title: 'Community Empowerment',
      description: 'Directly supporting local families and traditional craftspeople',
      details: [
        '80% of our guides are local residents',
        'Partnership with 15+ family-run accommodations',
        'Supporting women\'s cooperatives in Atlas Mountains',
        'Fair wages and working conditions for all partners'
      ],
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      icon: Leaf,
      title: 'Environmental Protection',
      description: 'Preserving Morocco\'s diverse ecosystems and natural beauty',
      details: [
        'Zero plastic policy on all desert tours',
        'Solar-powered camp facilities in Sahara',
        'Native tree planting program (200+ trees planted)',
        'Water conservation in all accommodations'
      ],
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      icon: Building,
      title: 'Heritage Preservation',
      description: 'Protecting and celebrating Morocco\'s cultural heritage',
      details: [
        'Supporting restoration of traditional riads',
        'Promoting traditional crafts and skills',
        'Educational tours about Berber culture',
        'Partnerships with local museums and cultural sites'
      ],
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      icon: Droplets,
      title: 'Responsible Resource Use',
      description: 'Minimizing our environmental footprint across all operations',
      details: [
        'Rainwater harvesting systems',
        'Locally sourced organic meals',
        'Minimal packaging and waste reduction',
        'Education about water conservation'
      ],
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100'
    }
  ];

  const impacts = [
    { metric: '85%', label: 'Revenue stays in local communities', icon: Users },
    { metric: '200+', label: 'Trees planted this year', icon: TreePine },
    { metric: '15', label: 'Local families directly supported', icon: Heart },
    { metric: '0', label: 'Single-use plastics in tours', icon: Recycle }
  ];

  const certifications = [
    'Responsible Tourism Morocco Certified',
    'Travelife Sustainability Certified',
    'Local Community Partnership Verified',
    'Green Tourism Morocco Member'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-black">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <Leaf className="h-8 w-8 text-black" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Sustainable Tourism</h1>
            <p className="text-xl text-black/90 leading-relaxed max-w-3xl mx-auto">
              Our commitment to preserving Morocco's natural beauty while supporting local communities 
              and ensuring tourism benefits everyone involved.
            </p>
            {onBack && (
              <Button 
                onClick={onBack}
                variant="outline" 
                className="mt-8 bg-white/10 border-white/30 text-black hover:bg-white/20"
              >
                ← Back to Home
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        {/* Mission Statement */}
        <div className="max-w-4xl mx-auto mb-20 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Our Sustainability Promise</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="text-left">
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                As a small Moroccan startup, we believe that responsible tourism should benefit 
                everyone – travelers, local communities, and the environment. Every tour we offer 
                is designed with sustainability at its core.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                We're not just showing you Morocco; we're helping preserve it for future generations 
                while ensuring that our success directly supports the communities we visit.
              </p>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=500&h=400&fit=crop" 
                alt="Sustainable tourism in Morocco"
                className="rounded-xl shadow-lg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-green-600/30 to-transparent rounded-xl"></div>
            </div>
          </div>
        </div>

        {/* Impact Metrics */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">Our Impact in Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {impacts.map((impact, index) => {
              const Icon = impact.icon;
              return (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-800 mb-2">{impact.metric}</div>
                    <div className="text-gray-600 text-sm leading-tight">{impact.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Sustainability Initiatives */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">Our Initiatives</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {initiatives.map((initiative, index) => {
              const Icon = initiative.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 ${initiative.bgColor} rounded-lg flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 ${initiative.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-gray-800">{initiative.title}</CardTitle>
                        <CardDescription className="text-gray-600">
                          {initiative.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {initiative.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-gray-600 text-sm leading-relaxed">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Progress Goals */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">2024-2025 Goals</h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TreePine className="h-5 w-5 text-green-600" />
                    <span>Reforestation Goal</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Trees Planted</span>
                      <span>200 / 500</span>
                    </div>
                    <Progress value={40} className="h-2" />
                    <p className="text-xs text-gray-600">
                      Partnership with Atlas Mountain communities to plant native species
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span>Community Support</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Families Supported</span>
                      <span>15 / 25</span>
                    </div>
                    <Progress value={60} className="h-2" />
                    <p className="text-xs text-gray-600">
                      Direct partnerships with local families and cooperatives
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Sun className="h-5 w-5 text-yellow-600" />
                    <span>Renewable Energy</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Solar Coverage</span>
                      <span>70 / 100%</span>
                    </div>
                    <Progress value={70} className="h-2" />
                    <p className="text-xs text-gray-600">
                      Solar power installation in desert camps and partner accommodations
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Recycle className="h-5 w-5 text-purple-600" />
                    <span>Waste Reduction</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Zero Plastic Tours</span>
                      <span>100%</span>
                    </div>
                    <Progress value={100} className="h-2" />
                    <p className="text-xs text-gray-600">
                      Complete elimination of single-use plastics across all tours
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Certifications */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">Certifications & Partnerships</h2>
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certifications.map((cert, index) => (
                <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{cert}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-12 text-center text-black">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Travel with Purpose</h2>
            <p className="text-xl text-black/90 mb-8 leading-relaxed">
              Choose TouriQuest for your Morocco adventure and become part of our sustainability mission. 
              Together, we can explore responsibly and make a positive impact.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-green-600 hover:bg-gray-100 font-semibold"
              >
                View Sustainable Tours
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-black hover:bg-white/10"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}