/**
 * Public Prompt App Page
 * Standalone page for executing prompts via public URL
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Sparkles, Copy, Check, ExternalLink } from 'lucide-react';
import { PromptApp } from '../types/promptforge';
import { getAppBySlug, executeApp } from '../services/promptAppService';
import { getPrompt } from '../services/promptForgeService';
import { generateFormFields, validateFormValues, FormField } from '../utils/promptParser';
import { supabase } from '../lib/supabase';

export function PromptApp() {
  const { slug } = useParams<{ slug: string }>();
  const [app, setApp] = useState<PromptApp | null>(null);
  const [promptBody, setPromptBody] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (slug) {
      loadApp();
    }
  }, [slug]);

  useEffect(() => {
    // Check auth requirement
    if (app?.require_auth) {
      checkAuth();
    }
  }, [app]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Redirect to login or show auth required message
      window.location.href = `/login?redirect=/app/${slug}`;
    }
  };

  const loadApp = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const appData = await getAppBySlug(slug);
      if (!appData) {
        setLoading(false);
        return;
      }

      setApp(appData);

      // Check if expired
      if (appData.expires_at && new Date(appData.expires_at) < new Date()) {
        setLoading(false);
        return;
      }

      // Load prompt
      const prompt = await getPrompt(appData.prompt_id);
      if (prompt) {
        const body = prompt.current_version?.prompt_body || prompt.prompt_body;
        setPromptBody(body);

        // Generate form fields
        const formFields = generateFormFields(body);
        setFields(formFields);

        // Initialize values
        const initialValues: Record<string, any> = {};
        formFields.forEach((field) => {
          if (field.default !== undefined) {
            initialValues[field.name] = field.default;
          }
        });
        setValues(initialValues);
      }
    } catch (error) {
      console.error('Failed to load app:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const validation = validateFormValues(fields, values);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setExecuting(true);
    setOutput('');

    try {
      if (!app) return;

      const execution = await executeApp(
        app.id,
        values,
        promptBody,
        app.prompt_id,
        'gpt-4o-mini',
        0.7
      );

      if (execution && execution.output) {
        setOutput(execution.output);
      } else {
        setOutput('Failed to execute prompt. Please try again.');
      }
    } catch (error) {
      console.error('Execution error:', error);
      setOutput('An error occurred. Please try again.');
    } finally {
      setExecuting(false);
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading app...</p>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">App Not Found</h1>
          <p className="text-gray-600">This app doesn't exist or has been deactivated.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{app.title}</h1>
          </div>
          {app.description && (
            <p className="text-gray-600 text-lg">{app.description}</p>
          )}
          <button
            onClick={copyLink}
            className="mt-4 px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-2 mx-auto"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Link copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy link
              </>
            )}
          </button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={values[field.name] || ''}
                    onChange={(e) =>
                      setValues({ ...values, [field.name]: e.target.value })
                    }
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={4}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      errors[field.name] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={values[field.name] || ''}
                    onChange={(e) =>
                      setValues({ ...values, [field.name]: e.target.value })
                    }
                    required={field.required}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      errors[field.name] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select an option...</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={values[field.name] || false}
                      onChange={(e) =>
                        setValues({ ...values, [field.name]: e.target.checked })
                      }
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-600">{field.description || field.label}</span>
                  </label>
                ) : (
                  <input
                    type={field.type}
                    value={values[field.name] || ''}
                    onChange={(e) =>
                      setValues({ ...values, [field.name]: e.target.value })
                    }
                    placeholder={field.placeholder}
                    required={field.required}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      errors[field.name] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                )}
                {errors[field.name] && (
                  <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
                )}
                {field.description && !errors[field.name] && (
                  <p className="mt-1 text-sm text-gray-500">{field.description}</p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={executing}
              className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-lg transition-all"
            >
              {executing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Execute Prompt
                </>
              )}
            </button>
          </form>
        </div>

        {/* Output */}
        {output && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Result</h2>
              <button
                onClick={copyOutput}
                className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-lg">
                {output}
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Powered by PromptForge
        </div>
      </div>
    </div>
  );
}
