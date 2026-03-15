import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  
  logo: {
    width: 60,
    height: 60,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  form: {
    marginBottom: 24,
  },
  
  inputGroup: {
    marginBottom: 20,
  },
  
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  
  inputFocused: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F9FF',
  },
  
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  
  inputContainer: {
    position: 'relative',
  },
  
  iconContainer: {
    position: 'absolute',
    right: 16,
    top: 38,
    justifyContent: 'center',
  },
  
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    fontWeight: '500',
  },
  
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  
  rememberCheck: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  
  checkboxText: {
    fontSize: 13,
    color: '#4B5563',
  },
  
  forgotPassword: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  
  loginButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  
  loginButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
  
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  signupText: {
    fontSize: 14,
    color: '#6B7280',
  },
  
  signupLink: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
    marginLeft: 4,
  },
  
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#9CA3AF',
  },
  
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  
  errorMessage: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  
  successIcon: {
    color: '#10B981',
    fontSize: 18,
  },
});
