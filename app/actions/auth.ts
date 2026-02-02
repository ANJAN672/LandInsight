'use server';

import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function registerUser(email: string, password: string, name?: string) {
    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name: name || email.split('@')[0],
        },
    });

    const token = await signToken({ userId: user.id, email: user.email, role: user.role });
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    });

    return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function loginUser(email: string, password: string) {
    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        throw new Error('Invalid credentials');
    }

    const token = await signToken({ userId: user.id, email: user.email, role: user.role });
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
    });

    return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function logoutUser() {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');
    return { success: true };
}
