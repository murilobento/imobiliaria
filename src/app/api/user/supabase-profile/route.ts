import { NextRequest, NextResponse } from 'next/server';
import { authenticateSupabaseUser } from '@/lib/auth/supabase-auth-utils';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/user/supabase-profile
 * Fetch current user's profile data using Supabase Auth
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user with Supabase
    const authResult = await authenticateSupabaseUser(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const user = authResult.user!;

    // Return user profile data
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        // Add other fields as needed
      }
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/supabase-profile
 * Update current user's profile using Supabase Auth
 */
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user with Supabase
    const authResult = await authenticateSupabaseUser(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const user = authResult.user!;
    const body = await request.json();

    // Get Supabase client with service role key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Update user metadata in Supabase Auth
    const updateData: any = {};
    
    if (body.email && body.email !== user.email) {
      updateData.email = body.email;
    }

    // Update user metadata for other fields
    if (body.username || body.name) {
      updateData.data = {
        username: body.username,
        name: body.name,
        // Preserve existing metadata
        ...user,
      };
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    // Update user in Supabase Auth
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, updateData);

    if (error) {
      console.error('Error updating user in Supabase:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao atualizar perfil' },
        { status: 500 }
      );
    }

    // Return updated profile data
    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || 'user',
        username: data.user.user_metadata?.username,
        name: data.user.user_metadata?.name,
      }
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}