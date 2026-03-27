import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const TEMPLATES = [
  {
    name: 'Exam Questions',
    description: 'Extract exam questions with MCQ options, answers, solutions, difficulty levels, and tags',
    template_schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          stem: { 
            type: 'string',
            description: 'The question text or prompt'
          },
          options: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Multiple choice options (A, B, C, D) - omit for short answer questions'
          },
          correctAnswer: { 
            type: 'string',
            description: 'The correct answer (letter for MCQ, full answer for short response)'
          },
          solution: { 
            type: 'string',
            description: 'Detailed explanation of the correct answer'
          },
          difficulty: { 
            type: 'number',
            description: 'Difficulty level from 1 (easy) to 5 (very hard)'
          },
          format: { 
            type: 'string',
            enum: ['mcq', 'short', 'essay', 'true-false'],
            description: 'Question format type'
          },
          tags: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Topic tags and keywords for categorization'
          }
        },
        required: ['stem', 'correctAnswer', 'format']
      }
    }
  },
  {
    name: 'Invoice',
    description: 'Extract invoice details including items, amounts, dates, and vendor information',
    template_schema: {
      type: 'object',
      properties: {
        invoice_number: { type: 'string' },
        invoice_date: { type: 'string' },
        due_date: { type: 'string' },
        vendor_name: { type: 'string' },
        vendor_address: { type: 'string' },
        customer_name: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'number' },
              unit_price: { type: 'number' },
              total: { type: 'number' }
            }
          }
        },
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        total_amount: { type: 'number' }
      }
    }
  },
  {
    name: 'Purchase Order',
    description: 'Extract purchase order details including items, quantities, and delivery info',
    template_schema: {
      type: 'object',
      properties: {
        po_number: { type: 'string' },
        buyer_name: { type: 'string' },
        supplier_name: { type: 'string' },
        po_date: { type: 'string' },
        delivery_date: { type: 'string' },
        items: {
          type: 'array',
          items: { type: 'object', properties: { description: { type: 'string' }, quantity: { type: 'number' }, unit_price: { type: 'number' }, total: { type: 'number' } } }
        },
        subtotal: { type: 'number' },
        total_amount: { type: 'number' },
        payment_terms: { type: 'string' },
        ship_to_address: { type: 'string' }
      }
    }
  },
  {
    name: 'Receipt',
    description: 'Extract receipt information including store details, items, and payment',
    template_schema: {
      type: 'object',
      properties: {
        store_name: { type: 'string' },
        store_address: { type: 'string' },
        transaction_date: { type: 'string' },
        transaction_time: { type: 'string' },
        receipt_number: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              unit_price: { type: 'number' },
              total_price: { type: 'number' }
            }
          }
        },
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        total: { type: 'number' },
        payment_method: { type: 'string' }
      }
    }
  },
  {
    name: 'Medical Record',
    description: 'Extract medical record information including patient details, diagnosis, and treatment',
    template_schema: {
      type: 'object',
      properties: {
        patient_id: { type: 'string' },
        patient_name: { type: 'string' },
        date_of_birth: { type: 'string' },
        date_of_visit: { type: 'string' },
        facility_name: { type: 'string' },
        doctor_name: { type: 'string' },
        chief_complaint: { type: 'string' },
        symptoms: { type: 'array', items: { type: 'string' } },
        diagnosis: { type: 'string' },
        tests_ordered: { type: 'array', items: { type: 'string' } },
        medications: { type: 'array', items: { type: 'string' } },
        follow_up: { type: 'string' }
      }
    }
  },
  {
    name: 'Lab Report',
    description: 'Extract laboratory test results and findings',
    template_schema: {
      type: 'object',
      properties: {
        lab_name: { type: 'string' },
        report_date: { type: 'string' },
        patient_id: { type: 'string' },
        patient_name: { type: 'string' },
        test_date: { type: 'string' },
        test_results: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, value: { type: 'string' }, range: { type: 'string' }, unit: { type: 'string' }, flag: { type: 'string' } } } },
        overall_findings: { type: 'string' },
        recommendations: { type: 'string' },
        technician_name: { type: 'string' },
        ordering_physician: { type: 'string' }
      }
    }
  },
  {
    name: 'Meeting Minutes',
    description: 'Extract meeting notes including attendees, agenda, decisions, and action items',
    template_schema: {
      type: 'object',
      properties: {
        meeting_title: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string' },
        location: { type: 'string' },
        attendees: { type: 'array', items: { type: 'string' } },
        agenda_items: { type: 'array', items: { type: 'string' } },
        decisions: { type: 'array', items: { type: 'string' } },
        action_items: { type: 'array', items: { type: 'string' } },
        next_meeting: { type: 'string' }
      }
    }
  },
  {
    name: 'Contract',
    description: 'Extract contract details including parties, dates, terms, and clauses',
    template_schema: {
      type: 'object',
      properties: {
        contract_title: { type: 'string' },
        contract_date: { type: 'string' },
        effective_date: { type: 'string' },
        party_1: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: { type: 'string' },
            role: { type: 'string' }
          }
        },
        party_2: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: { type: 'string' },
            role: { type: 'string' }
          }
        },
        terms: {
          type: 'array',
          items: { type: 'string' }
        },
        payment_terms: { type: 'string' }
      }
    }
  },
  {
    name: 'Resume/CV',
    description: 'Extract resume information including personal details, education, work and skills',
    template_schema: {
      type: 'object',
      properties: {
        full_name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        website: { type: 'string' },
        linkedin: { type: 'string' },
        education: { type: 'array', items: { type: 'object', properties: { institution: { type: 'string' }, degree: { type: 'string' }, field: { type: 'string' }, start_date: { type: 'string' }, end_date: { type: 'string' } } } },
        work_experience: { type: 'array', items: { type: 'object', properties: { company: { type: 'string' }, title: { type: 'string' }, start_date: { type: 'string' }, end_date: { type: 'string' }, responsibilities: { type: 'array', items: { type: 'string' } } } } },
        skills: { type: 'array', items: { type: 'string' } },
        languages: { type: 'array', items: { type: 'string' } },
        certifications: { type: 'array', items: { type: 'string' } },
        professional_summary: { type: 'string' }
      }
    }
  },
  {
    name: 'Document Summary',
    description: 'Extract a general summary with title, dates, authors, and key points',
    template_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        date: { type: 'string' },
        author: { type: 'string' },
        summary: { type: 'string' },
        key_points: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  },
  {
    name: 'Document Analysis',
    description: 'Advanced analysis with core ideas, recommendations and confidence',
    template_schema: {
      type: 'object',
      properties: {
        content_analysis: { type: 'string' },
        key_points: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
        confidence_score: { type: 'number' }
      }
    }
  },
  {
    name: 'Product Catalog',
    description: 'Extract product catalog items, prices and specifications',
    template_schema: {
      type: 'object',
      properties: {
        catalog_name: { type: 'string' },
        company_name: { type: 'string' },
        catalog_date: { type: 'string' },
        products: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, sku: { type: 'string' }, price: { type: 'number' }, specs: { type: 'string' } } } }
      }
    }
  },
  {
    name: 'Real Estate Listing',
    description: 'Extract property listing details including features and price',
    template_schema: {
      type: 'object',
      properties: {
        property_address: { type: 'string' },
        listing_price: { type: 'number' },
        bedrooms: { type: 'number' },
        bathrooms: { type: 'number' },
        square_footage: { type: 'number' },
        lot_size: { type: 'string' },
        year_built: { type: 'string' },
        features: { type: 'array', items: { type: 'string' } },
        agent_name: { type: 'string' },
        agent_contact: { type: 'string' }
      }
    }
  },
  {
    name: 'Business Card',
    description: 'Extract business card information including contact details',
    template_schema: {
      type: 'object',
      properties: {
        full_name: { type: 'string' },
        job_title: { type: 'string' },
        company_name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        website: { type: 'string' },
        address: { type: 'string' }
      }
    }
  }
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Uses service role to bypass RLS
    );

    const results = {
      added: [] as string[],
      skipped: [] as string[],
      failed: [] as string[]
    };

    for (const template of TEMPLATES) {
      try {
        const { data, error } = await supabaseClient
          .from('structure_templates')
          .insert({
            name: template.name,
            description: template.description,
            template_schema: template.template_schema,
            is_public: true,
            user_id: null
          });

        if (error) {
          if (error.code === '23505') { // Unique violation
            results.skipped.push(template.name);
          } else {
            results.failed.push(template.name);
            console.error(`Failed to add ${template.name}:`, error);
          }
        } else {
          results.added.push(template.name);
        }
      } catch (err) {
        results.failed.push(template.name);
        console.error(`Error adding ${template.name}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Added ${results.added.length} templates`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add templates'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

