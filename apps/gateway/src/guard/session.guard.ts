import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class SessionAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();

        const userId = req.session?.user;

        if (!userId) {
            throw new UnauthorizedException({
                error: 'UNAUTHORIZED',
                message: 'You must be logged in to access this resource.',
            });
        }

        req.userId = userId;

        return true;
    }
}